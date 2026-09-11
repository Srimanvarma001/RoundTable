import type { AgentCallRequest, LLMAdapter } from "../llm/types";

export interface SchedulerOpts {
  concurrency?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface SchedTask<T> {
  key: string;
  run: (signal: AbortSignal) => Promise<T>;
  onSuccess?: (v: T) => Promise<void> | void;
  onFailure?: (e: unknown) => Promise<void> | void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Concurrency pool, pause flag checked before dispatch, retries 429/5xx/network/StructuredOutput. */
export class Scheduler {
  constructor(private opts: SchedulerOpts = {}) {}

  async run<T>(
    tasks: SchedTask<T>[],
    isPaused: () => boolean,
    checkBudget: () => void,
  ): Promise<void> {
    const conc = this.opts.concurrency ?? 8;
    const queue = [...tasks];
    const workers: Promise<void>[] = [];
    const worker = async () => {
      while (queue.length > 0) {
        if (isPaused()) return;
        checkBudget();
        const t = queue.shift()!;
        await this.runOne(t);
      }
    };
    for (let i = 0; i < Math.min(conc, tasks.length); i++) workers.push(worker());
    await Promise.all(workers);
  }

  private async runOne<T>(t: SchedTask<T>): Promise<void> {
    const maxRetries = this.opts.maxRetries ?? 2;
    let attempt = 0;
    for (;;) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs ?? 90_000);
      try {
        const v = await t.run(ctrl.signal);
        clearTimeout(timer);
        await t.onSuccess?.(v);
        return;
      } catch (e) {
        clearTimeout(timer);
        const retryable =
          (e as { retryable?: boolean })?.retryable === true ||
          (e as Error)?.name === "StructuredOutputError" ||
          /429|5\d\d|ECONN|ETIMEDOUT|fetch failed/i.test((e as Error)?.message ?? "");
        if (retryable && attempt < maxRetries) {
          attempt++;
          const backoff = (attempt === 1 ? 1000 : 4000) + Math.random() * 500;
          await sleep(backoff);
          continue;
        }
        await t.onFailure?.(e);
        return;
      }
    }
  }
}

export type { AgentCallRequest, LLMAdapter };
