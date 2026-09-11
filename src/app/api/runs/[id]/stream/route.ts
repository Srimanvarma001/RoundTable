import { getDb } from "@/lib/db/client";
import { runEvents, runs } from "@/lib/db/schema";
import { eq, gt, and, asc } from "drizzle-orm";
import { getBus } from "@/lib/orchestrator/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["completed", "failed", "aborted"]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const lastIdHeader = req.headers.get("last-event-id");
  const after = lastIdHeader ? Number(lastIdHeader) : 0;

  const encoder = new TextEncoder();
  const bus = getBus();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string, eventId?: number) => {
        let frame = "";
        if (eventId !== undefined) frame += `id: ${eventId}\n`;
        for (const line of data.split("\n")) frame += `data: ${line}\n`;
        frame += "\n";
        controller.enqueue(encoder.encode(frame));
      };
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(":heartbeat\n\n"));
      }, 15000);

      try {
        // replay missed events
        const missed = await db
          .select()
          .from(runEvents)
          .where(and(eq(runEvents.runId, id), gt(runEvents.id, after)))
          .orderBy(asc(runEvents.id));
        for (const m of missed) {
          send(JSON.stringify({
            seq: m.seq, runId: m.runId, type: m.type, agentId: m.agentId,
            step: m.step, payload: JSON.parse(m.payload), createdAt: m.createdAt,
          }), m.id);
        }
        const unsub = bus.subscribe(id, (e) => {
          send(JSON.stringify(e));
          if (e.type === "run.completed" || e.type === "run.failed" || e.type === "run.aborted") {
            clearInterval(heartbeat);
            unsub();
            controller.close();
          }
        });
        // close when terminal already
        const r = (await db.select().from(runs).where(eq(runs.id, id)))[0];
        if (r && TERMINAL.has(r.status)) {
          // give live events a moment, then close
          setTimeout(() => {
            clearInterval(heartbeat);
            unsub();
            try { controller.close(); } catch { /* closed */ }
          }, 1000);
        }
        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          unsub();
          try { controller.close(); } catch { /* closed */ }
        });
      } catch {
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
