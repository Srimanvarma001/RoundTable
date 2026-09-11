import { EventEmitter } from "node:events";
import { eq, and, gt, asc } from "drizzle-orm";
import { getDb, ensureDb } from "../db/client";
import { runEvents } from "../db/schema";
import type { RunEvent, RunEventType } from "@/shared/events";
import type { StepName } from "@/shared/constants";

export interface RunEventBus {
  publish(event: Omit<RunEvent, "seq">): Promise<RunEvent>;
  subscribe(runId: string, onEvent: (e: RunEvent) => void): () => void;
  replay(runId: string, afterSeq: number): Promise<RunEvent[]>;
}

/** Single-process bus: EventEmitter live + run_events table durable. Swap for Redis to host. */
export class InMemoryRunEventBus implements RunEventBus {
  private ee = new EventEmitter();
  private coalesce = new Map<string, { text: string; kind: string; timer?: NodeJS.Timeout }>();
  constructor() {
    this.ee.setMaxListeners(100);
  }

  async publish(event: Omit<RunEvent, "seq">): Promise<RunEvent> {
    await ensureDb();
    const db = getDb();
    const existing = await db
      .select()
      .from(runEvents)
      .where(eq(runEvents.runId, event.runId));
    const seq =
      existing.length === 0 ? 1 : Math.max(...existing.map((r) => r.seq)) + 1;
    await db.insert(runEvents).values({
      runId: event.runId,
      seq,
      type: event.type,
      agentId: event.agentId ?? null,
      step: event.step ?? null,
      payload: JSON.stringify(event.payload ?? {}),
      createdAt: event.createdAt,
    });
    const full: RunEvent = { ...event, seq };
    this.ee.emit(`run:${event.runId}`, full);
    return full;
  }

  /** Coalesce text deltas: 40ms or 40 chars, whichever first (§13.2). */
  async publishDelta(
    runId: string,
    agentId: string,
    step: StepName,
    kind: "reasoning" | "text",
    text: string,
  ): Promise<void> {
    const key = `${runId}:${agentId}:${kind}`;
    const cur = this.coalesce.get(key) ?? { text: "", kind };
    cur.text += text;
    this.coalesce.set(key, cur);
    const flush = () => {
      const c = this.coalesce.get(key);
      if (!c || !c.text) return;
      this.coalesce.delete(key);
      void this.publish({
        runId,
        type: "agent.delta",
        agentId,
        step,
        payload: { kind, text: c.text },
        createdAt: Date.now(),
      });
    };
    if (cur.text.length >= 40) {
      if (cur.timer) clearTimeout(cur.timer);
      flush();
    } else if (!cur.timer) {
      cur.timer = setTimeout(flush, 40);
    }
  }

  subscribe(runId: string, onEvent: (e: RunEvent) => void): () => void {
    const h = (e: RunEvent) => onEvent(e);
    this.ee.on(`run:${runId}`, h);
    return () => this.ee.off(`run:${runId}`, h);
  }

  async replay(runId: string, afterSeq: number): Promise<RunEvent[]> {
    await ensureDb();
    const db = getDb();
    const rows = await db
      .select()
      .from(runEvents)
      .where(and(eq(runEvents.runId, runId), gt(runEvents.seq, afterSeq)))
      .orderBy(asc(runEvents.seq));
    return rows.map((r) => ({
      seq: r.seq,
      runId: r.runId,
      type: r.type as RunEventType,
      agentId: r.agentId ?? undefined,
      step: (r.step as StepName) ?? undefined,
      payload: JSON.parse(r.payload),
      createdAt: r.createdAt,
    }));
  }
}

let singleton: InMemoryRunEventBus | null = null;
export function getBus(): InMemoryRunEventBus {
  if (!singleton) singleton = new InMemoryRunEventBus();
  return singleton;
}
