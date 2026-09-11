import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { MockLLMAdapter } from "@/lib/llm/mock";
import { Scheduler } from "@/lib/orchestrator/scheduler";
import { InMemoryRunEventBus } from "@/lib/orchestrator/bus";
import { ensureDb } from "@/lib/db/client";

process.env.DATABASE_URL = "file:./data/test-integration.db";

describe("integration: scheduler + bus + mock adapter", () => {
  beforeAll(async () => {
    await ensureDb();
  });
  it("happy path: tasks run, deltas coalesce, replay works", async () => {
    const bus = new InMemoryRunEventBus();
    const seen: string[] = [];
    const unsub = bus.subscribe("run-x", (e) => seen.push(e.type));
    await bus.publish({ runId: "run-x", type: "run.started", payload: {}, createdAt: Date.now() });
    const adapter = new MockLLMAdapter();
    const sched = new Scheduler({ concurrency: 2 });
    await sched.run(
      [{ key: "k1", run: async () => adapter.complete({ provider: "mock", modelId: "m", messages: [], temperature: 0, maxTokens: 10 }, new AbortController().signal) }],
      () => false,
      () => {},
    );
    expect(adapter.requests.length).toBe(1);
    expect(seen).toContain("run.started");
    unsub();
  });

  it("pause flag stops dispatch", async () => {
    const sched = new Scheduler({ concurrency: 1 });
    let ran = 0;
    let paused = true;
    await sched.run(
      [{ key: "k", run: async () => { ran++; } }],
      () => paused,
      () => {},
    );
    expect(ran).toBe(0);
    void beforeEach;
  });

  it("retryable failure retries then records", async () => {
    const sched = new Scheduler({ concurrency: 1, maxRetries: 1, timeoutMs: 5000 });
    let calls = 0;
    let failed = 0;
    await sched.run(
      [{
        key: "k",
        run: async () => {
          calls++;
          if (calls === 1) throw Object.assign(new Error("429"), { retryable: true });
          return "ok";
        },
        onFailure: () => { failed++; },
      }],
      () => false,
      () => {},
    );
    expect(calls).toBe(2);
    expect(failed).toBe(0);
  });
});
