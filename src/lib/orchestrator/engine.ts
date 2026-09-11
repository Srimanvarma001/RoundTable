import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getDb } from "../db/client";
import { ensureDb } from "../db/client";
import { runs, proposals, critiques, votes, agentMessages } from "../db/schema";
import { getBus } from "./bus";
import { BudgetGuard } from "./budget";
import { Scheduler } from "./scheduler";
import { buildRequest, type RunContext } from "./context";
import { proposeTasks, debateTasks, refineTasks, voteTasks } from "./steps/tasks";
import { taskKey } from "./taskKey";
import { ProposeSchema, DebateSchema, RefineSchema, VoteSchema, RevealSchema, extractJson } from "../llm/json";
import { normaliseWeights, finalScores, breakTies, collectDissent, distinctness } from "../agents/weights";
import { estimateCost, estimateTokens } from "../llm/pricing";
import { getAdapter } from "../llm/registry";
import { MockLLMAdapter } from "../llm/mock";
import { config } from "../config";
import { logger } from "../logger";
import type { AgentDTO } from "@/shared/types";
import type { StepName } from "@/shared/constants";
import { randomUUID } from "node:crypto";

async function taskExists(key: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.select().from(agentMessages).where(eq(agentMessages.taskKey, key));
  return rows.length > 0;
}

export interface CreateRunOpts {
  seedPrompt: string;
  seedMode?: string;
  refineEnabled?: boolean;
  budgetUsd?: number;
  searchSnippets?: string;
}

export async function createRun(opts: CreateRunOpts): Promise<string> {
  await ensureDb();
  const db = getDb();
  const { agents, profiles, profileItems } = await import("../db/schema");
  const { SEAT_DEFAULTS } = await import("../agents/defaults");
  const { eq: eq2 } = await import("drizzle-orm");
  const userId = config.appUserId;
  // ensure seeded agents exist
  const existing = await db.select().from(agents).where(eq2(agents.userId, userId));
  let seatRows = existing;
  if (existing.length === 0) {
    const now = Date.now();
    for (const s of SEAT_DEFAULTS) {
      await db.insert(agents).values({
        id: randomUUID(),
        userId,
        seatKey: s.seatKey,
        name: s.name,
        isMeAgent: s.isMeAgent ? 1 : 0,
        lensPrompt: s.lensPrompt,
        provider: s.provider,
        modelId: s.modelId,
        temperature: s.temperature,
        weight: s.weight,
        avatarStyle: s.avatarStyle,
        avatarSeed: s.seatKey,
        accentColor: s.accentColor,
        accentToken: s.accentToken,
        enabled: 1,
        orderIndex: s.orderIndex,
        createdAt: now,
        updatedAt: now,
      });
    }
    seatRows = await db.select().from(agents).where(eq2(agents.userId, userId));
  }
  const profRows = await db.select().from(profiles).where(eq2(profiles.userId, userId));
  const active = profRows.find((p) => p.status === "active") ?? profRows[0];
  const runId = randomUUID();
  await db.insert(runs).values({
    id: runId,
    userId,
    seedPrompt: opts.seedPrompt,
    seedMode: opts.seedMode ?? "vague",
    status: "created",
    currentStep: "propose",
    agentSnapshot: JSON.stringify(
      seatRows.map((a) => ({
        id: a.id, seatKey: a.seatKey, name: a.name, isMeAgent: !!a.isMeAgent,
        lensPrompt: a.lensPrompt, provider: a.provider, modelId: a.modelId,
        temperature: a.temperature, weight: a.weight, enabled: !!a.enabled,
        orderIndex: a.orderIndex, accentColor: a.accentColor, accentToken: a.accentToken,
        avatarStyle: a.avatarStyle, avatarSeed: a.avatarSeed,
      })),
    ),
    configSnapshot: JSON.stringify({
      refineEnabled: opts.refineEnabled ?? true,
      budgetUsd: opts.budgetUsd ?? config.runBudgetUsd,
      searchSnippets: opts.searchSnippets ?? "",
    }),
    profileId: active?.id ?? null,
    createdAt: Date.now(),
  });
  return runId;
}

function snapshotAgents(run: typeof runs.$inferSelect): AgentDTO[] {
  const arr = JSON.parse(run.agentSnapshot) as AgentDTO[];
  return arr.sort((a, b) => a.orderIndex - b.orderIndex);
}

async function loadContext(runId: string): Promise<{ run: typeof runs.$inferSelect; ctx: RunContext }> {
  await ensureDb();
  const db = getDb();
  const { profiles: profT, profileItems: itemsT } = await import("../db/schema");
  const runRows = await db.select().from(runs).where(eq(runs.id, runId));
  const run = runRows[0];
  if (!run) throw new Error(`run not found: ${runId}`);
  const agents = snapshotAgents(run);
  const cfg = JSON.parse(run.configSnapshot || "{}");
  const propRows = await db.select().from(proposals).where(eq(proposals.runId, runId));
  const critRows = await db.select().from(critiques).where(eq(critiques.runId, runId));
  let authorBrief = "A generalist builder.";
  let summary = "A generalist builder.";
  if (run.profileId) {
    const pRows = await db.select().from(profT).where(eq(profT.id, run.profileId));
    const p = pRows[0];
    if (p) {
      authorBrief = p.authorBrief || authorBrief;
      summary = p.summaryText || summary;
    }
  }
  const ctx: RunContext = {
    runId,
    seedPrompt: run.seedPrompt,
    seedMode: run.seedMode,
    agents,
    authorBrief,
    profileSummary: summary,
    searchSnippets: cfg.searchSnippets ?? "",
    proposals: propRows.map((p) => ({
      id: p.id, agentId: p.agentId, title: p.title, description: p.description,
      rationale: p.rationale, round: p.round, createdAt: p.createdAt,
    })),
    critiques: critRows.map((c) => ({
      agentId: c.agentId, targetProposalId: c.targetProposalId, stance: c.stance, comment: c.comment,
    })),
  };
  return { run, ctx };
}

/** Run one agent call with streaming → bus, persistence, budget. Returns parsed JSON or null on failure. */
async function callAgent(
  runId: string,
  step: StepName,
  agent: AgentDTO,
  round: number,
  guard: BudgetGuard,
  signal?: AbortSignal,
): Promise<{ parsed: unknown; result: import("../llm/types").AgentCallResult } | null> {
  const db = getDb();
  const bus = getBus();
  const { ctx } = await loadContext(runId);
  const req = buildRequest(ctx, agent, step);
  const key = taskKey(runId, step, agent.id, round);
  if (await taskExists(key)) return null; // idempotent resume
  const adapter = config.mockLlm ? new MockLLMAdapter() : getAdapter(agent.provider);
  const started = Date.now();
  await bus.publish({ runId, type: "agent.status", agentId: agent.id, step, payload: { status: "thinking" }, createdAt: Date.now() });
  let reasoning = "";
  let content = "";
  let tokensIn = 0;
  let tokensOut = 0;
  try {
    const abort = signal ?? new AbortController().signal;
    for await (const d of adapter.stream(req, abort)) {
      if (d.kind === "reasoning") reasoning += d.text;
      else content += d.text;
      await bus.publishDelta(runId, agent.id, step, d.kind, d.text);
    }
    tokensIn = estimateTokens(JSON.stringify(req.messages));
    tokensOut = estimateTokens(reasoning + content);
    const cost = estimateCost(agent.provider, agent.modelId, tokensIn, tokensOut);
    guard.record(cost, tokensIn, tokensOut);
    await db.insert(agentMessages).values({
      id: randomUUID(), runId, agentId: agent.id, step, taskKey: key,
      requestJson: JSON.stringify({ model: req.modelId, messages: req.messages }),
      reasoningText: reasoning, contentText: content,
      tokensIn, tokensOut, costUsd: cost, latencyMs: Date.now() - started,
      finishReason: "stop", createdAt: Date.now(),
    });
    await db
      .update(runs)
      .set({
        // atomic increments: parallel tasks must never lost-update shared counters
        tokensIn: sql`${runs.tokensIn} + ${tokensIn}`,
        tokensOut: sql`${runs.tokensOut} + ${tokensOut}`,
        costEstimateUsd: sql`${runs.costEstimateUsd} + ${cost}`,
        llmCalls: sql`${runs.llmCalls} + 1`,
      })
      .where(eq(runs.id, runId));
    await bus.publish({
      runId, type: "agent.done", agentId: agent.id, step,
      payload: { finalText: content.slice(0, 2000), tokensIn, tokensOut, costUsd: cost, latencyMs: Date.now() - started },
      createdAt: Date.now(),
    });
    const schema =
      step === "propose" ? ProposeSchema : step === "debate" ? DebateSchema : step === "refine" ? RefineSchema : VoteSchema;
    try {
      const parsed: unknown = extractJson(content || "{}", schema as never);
      return { parsed, result: { reasoningText: reasoning, contentText: content, tokensIn, tokensOut, finishReason: "stop", latencyMs: Date.now() - started } };
    } catch {
      await bus.publish({ runId, type: "agent.failed", agentId: agent.id, step, payload: { code: "STRUCTURED_OUTPUT", message: "schema validation failed", retryable: true }, createdAt: Date.now() });
      return null;
    }
  } catch (e) {
    const msg = (e as Error)?.message ?? "provider error";
    const retryable = (e as { retryable?: boolean })?.retryable ?? /429|5\d\d/i.test(msg);
    await bus.publish({ runId, type: "agent.failed", agentId: agent.id, step, payload: { code: "PROVIDER", message: msg, retryable }, createdAt: Date.now() });
    return null;
  }
}

function normTitle(s: string): string {
  return s.trim().toLowerCase();
}

export async function runLoop(runId: string): Promise<void> {
  await ensureDb();
  const db = getDb();
  const bus = getBus();
  const rows = await db.select().from(runs).where(eq(runs.id, runId));
  const run0 = rows[0];
  if (!run0) throw new Error("run not found");
  const cfg = JSON.parse(run0.configSnapshot || "{}");
  const guard = new BudgetGuard(
    {
      usedUsd: run0.costEstimateUsd,
      limitUsd: cfg.budgetUsd ?? config.runBudgetUsd,
      tokensUsed: run0.tokensIn + run0.tokensOut,
      tokenLimit: config.runMaxTokens,
      callsUsed: run0.llmCalls,
      callLimit: config.runMaxCalls,
    },
    (pct) => {
      void bus.publish({ runId, type: "budget.warning", payload: { usedUsd: guard.state.usedUsd, limitUsd: guard.state.limitUsd, pct }, createdAt: Date.now() });
    },
  );
  const scheduler = new Scheduler({ concurrency: 8, maxRetries: 2, timeoutMs: 90_000 });
  await db.update(runs).set({ status: "running", startedAt: Date.now() }).where(eq(runs.id, runId));
  await bus.publish({ runId, type: "run.started", payload: { steps: ["propose", "debate", "refine", "vote", "reveal"] }, createdAt: Date.now() });

  const isPaused = (): boolean => false; // pause flag read from DB per dispatch below
  const pausedCheck = async (): Promise<boolean> => {
    const r = (await db.select().from(runs).where(eq(runs.id, runId)))[0];
    return !!r?.pauseRequested;
  };

  try {
    // ── PROPOSE ──
    await bus.publish({ runId, type: "step.started", step: "propose", payload: { step: "propose", round: 1 }, createdAt: Date.now() });
    {
      const { ctx } = await loadContext(runId);
      const tasks = proposeTasks(ctx);
      await scheduler.run(
        tasks.map((t) => ({
          key: t.taskKey,
          run: async () => {
            if (await pausedCheck()) throw Object.assign(new Error("paused"), { paused: true });
            guard.checkBeforeDispatch();
            const agent = ctx.agents.find((a) => a.id === t.agentId)!;
            const out = await callAgent(runId, "propose", agent, 1, guard);
            if (out) {
              const parsed = out.parsed as { proposals: Array<{ title: string; description: string; rationale: string }> };
              for (const p of parsed.proposals.slice(0, 2)) {
                await db.insert(proposals).values({
                  id: randomUUID(), runId, agentId: agent.id, round: 1,
                  title: p.title.slice(0, 80), description: p.description, rationale: p.rationale ?? "",
                  status: "active", createdAt: Date.now(),
                });
              }
            }
          },
        })),
        () => false,
        () => guard.checkBeforeDispatch(),
      );
      if (await pausedCheck()) {
        await db.update(runs).set({ status: "paused" }).where(eq(runs.id, runId));
        await bus.publish({ runId, type: "run.paused", payload: { pendingTaskKeys: [], nextStep: "debate" }, createdAt: Date.now() });
        return;
      }
    }
    const propCount = (await db.select().from(proposals).where(eq(proposals.runId, runId))).length;
    if (propCount < 3) {
      await db.update(runs).set({ status: "failed", errorCode: "INSUFFICIENT_PROPOSALS", errorMessage: "fewer than 3 proposals", completedAt: Date.now() }).where(eq(runs.id, runId));
      await bus.publish({ runId, type: "run.failed", payload: { code: "INSUFFICIENT_PROPOSALS", message: "fewer than 3 proposals" }, createdAt: Date.now() });
      return;
    }
    await bus.publish({ runId, type: "step.completed", step: "propose", payload: { step: "propose", summary: `${propCount} proposals` }, createdAt: Date.now() });

    // ── DEBATE ──
    await bus.publish({ runId, type: "step.started", step: "debate", payload: { step: "debate", round: 1 }, createdAt: Date.now() });
    {
      const { ctx } = await loadContext(runId);
      const tasks = debateTasks(ctx);
      await scheduler.run(
        tasks.map((t) => ({
          key: t.taskKey,
          run: async () => {
            if (await pausedCheck()) throw Object.assign(new Error("paused"), { paused: true });
            guard.checkBeforeDispatch();
            const agent = ctx.agents.find((a) => a.id === t.agentId)!;
            const out = await callAgent(runId, "debate", agent, 1, guard);
            if (out) {
              const parsed = out.parsed as { critiques: Array<{ target_title: string; stance: string; comment: string }> };
              const byTitle = new Map(ctx.proposals.map((p) => [normTitle(p.title), p.id]));
              for (const c of parsed.critiques.slice(0, 3)) {
                const targetId = byTitle.get(normTitle(c.target_title));
                if (!targetId) continue; // drop unmatchable with warning, don't fail
                await db.insert(critiques).values({
                  id: randomUUID(), runId, agentId: agent.id, targetProposalId: targetId,
                  stance: c.stance, comment: c.comment.slice(0, 2000), round: 1, createdAt: Date.now(),
                });
              }
            }
          },
        })),
        () => false,
        () => guard.checkBeforeDispatch(),
      );
      if (await pausedCheck()) {
        await db.update(runs).set({ status: "paused", currentStep: "debate" }).where(eq(runs.id, runId));
        await bus.publish({ runId, type: "run.paused", payload: { pendingTaskKeys: [], nextStep: "refine" }, createdAt: Date.now() });
        return;
      }
    }
    await bus.publish({ runId, type: "step.completed", step: "debate", payload: { step: "debate", summary: "critiques recorded" }, createdAt: Date.now() });

    // ── REFINE (skipped when disabled or no critiques) ──
    const critRows = await db.select().from(critiques).where(eq(critiques.runId, runId));
    if (!cfg.refineEnabled || critRows.length === 0) {
      await db.update(runs).set({ currentStep: "vote" }).where(eq(runs.id, runId));
    } else {
      await bus.publish({ runId, type: "step.started", step: "refine", payload: { step: "refine", round: 2 }, createdAt: Date.now() });
      const { ctx } = await loadContext(runId);
      const tasks = refineTasks(ctx);
      await scheduler.run(
        tasks.map((t) => ({
          key: t.taskKey,
          run: async () => {
            if (await pausedCheck()) throw Object.assign(new Error("paused"), { paused: true });
            guard.checkBeforeDispatch();
            const agent = ctx.agents.find((a) => a.id === t.agentId)!;
            const out = await callAgent(runId, "refine", agent, 2, guard);
            if (out) {
              const parsed = out.parsed as { refined: { title: string; description: string; rationale: string; merges_proposal_titles?: string[] } | null };
              if (parsed.refined) {
                const byTitle = new Map(ctx.proposals.map((p) => [normTitle(p.title), p.id]));
                const parent = ctx.proposals.find((p) => p.agentId === agent.id)?.id ?? null;
                const merges = (parsed.refined.merges_proposal_titles ?? [])
                  .map((m) => byTitle.get(normTitle(m)))
                  .filter(Boolean) as string[];
                const id = randomUUID();
                await db.insert(proposals).values({
                  id, runId, agentId: agent.id, round: 2,
                  title: parsed.refined.title.slice(0, 80),
                  description: parsed.refined.description,
                  rationale: parsed.refined.rationale ?? "",
                  parentProposalId: parent, status: "active", createdAt: Date.now(),
                });
                for (const m of merges) {
                  await db.update(proposals).set({ status: "merged" }).where(and(eq(proposals.id, m), eq(proposals.runId, runId)));
                }
              }
            }
          },
        })),
        () => false,
        () => guard.checkBeforeDispatch(),
      );
      if (await pausedCheck()) {
        await db.update(runs).set({ status: "paused", currentStep: "refine" }).where(eq(runs.id, runId));
        await bus.publish({ runId, type: "run.paused", payload: { pendingTaskKeys: [], nextStep: "vote" }, createdAt: Date.now() });
        return;
      }
      await bus.publish({ runId, type: "step.completed", step: "refine", payload: { step: "refine", summary: "refinements applied" }, createdAt: Date.now() });
    }

    // ── VOTE (one call per agent over all targets) ──
    await bus.publish({ runId, type: "step.started", step: "vote", payload: { step: "vote", round: 1 }, createdAt: Date.now() });
    {
      const { ctx } = await loadContext(runId);
      const activeProps = ctx.proposals; // refine marks merged; vote over active only
      const dbProps = await db.select().from(proposals).where(eq(proposals.runId, runId));
      const surviving = dbProps.filter((p) => p.status === "active");
      const tasks = voteTasks({ ...ctx, proposals: surviving.map((p) => ({ id: p.id, agentId: p.agentId, title: p.title, description: p.description, rationale: p.rationale, round: p.round, createdAt: p.createdAt })) });
      const norm = normaliseWeights(ctx.agents.map((a) => ({ id: a.id, weight: a.weight, enabled: a.enabled })));
      await scheduler.run(
        tasks.map((t) => ({
          key: t.taskKey,
          run: async () => {
            if (await pausedCheck()) throw Object.assign(new Error("paused"), { paused: true });
            guard.checkBeforeDispatch();
            const agent = ctx.agents.find((a) => a.id === t.agentId)!;
            const out = await callAgent(runId, "vote", agent, 1, guard);
            const w = norm.get(agent.id) ?? 0;
            if (out) {
              const parsed = out.parsed as { votes: Array<{ proposal_title: string; score: number; comment: string }> };
              const byTitle = new Map(surviving.map((p) => [normTitle(p.title), p.id]));
              const seen = new Set<string>();
              for (const v of parsed.votes) {
                const pid = byTitle.get(normTitle(v.proposal_title));
                if (!pid) continue;
                seen.add(pid);
                await db.insert(votes).values({
                  id: randomUUID(), runId, agentId: agent.id, proposalId: pid,
                  score: Math.max(1, Math.min(10, Math.round(v.score))),
                  weightAtVote: w, weightedScore: v.score * w,
                  comment: v.comment ?? "", createdAt: Date.now(),
                });
              }
              for (const p of surviving) {
                if (!seen.has(p.id)) {
                  await db.insert(votes).values({
                    id: randomUUID(), runId, agentId: agent.id, proposalId: p.id,
                    score: 1, weightAtVote: w, weightedScore: 1 * w,
                    comment: "missing vote treated as 1", createdAt: Date.now(),
                  });
                }
              }
            }
            // incremental partial scores for the vote plinth
            const allVotes = await db.select().from(votes).where(eq(votes.runId, runId));
            const scores = finalScores(
              allVotes.map((v) => ({ agentId: v.agentId, proposalId: v.proposalId, score: v.score })),
              norm,
            );
            await bus.publish({
              runId, type: "agent.done", agentId: agent.id, step: "vote",
              payload: { partial_scores: Object.fromEntries(scores) },
              createdAt: Date.now(),
            });
          },
        })),
        () => false,
        () => guard.checkBeforeDispatch(),
      );
      if (await pausedCheck()) {
        await db.update(runs).set({ status: "paused", currentStep: "vote" }).where(eq(runs.id, runId));
        await bus.publish({ runId, type: "run.paused", payload: { pendingTaskKeys: [], nextStep: "reveal" }, createdAt: Date.now() });
        return;
      }
    }
    await bus.publish({ runId, type: "step.completed", step: "vote", payload: { step: "vote", summary: "votes tallied" }, createdAt: Date.now() });

    // ── REVEAL (synthesis; deterministic fallback on failure) ──
    await bus.publish({ runId, type: "step.started", step: "reveal", payload: { step: "reveal", round: 1 }, createdAt: Date.now() });
    {
      const { ctx, run } = await loadContext(runId);
      const dbVotes = await db.select().from(votes).where(eq(votes.runId, runId));
      const dbProps = await db.select().from(proposals).where(eq(proposals.runId, runId));
      const active = dbProps.filter((p) => p.status === "active");
      const norm = normaliseWeights(ctx.agents.map((a) => ({ id: a.id, weight: a.weight, enabled: a.enabled })));
      const scores = finalScores(dbVotes.map((v) => ({ agentId: v.agentId, proposalId: v.proposalId, score: v.score })), norm);
      const meAgent = ctx.agents.find((a) => a.isMeAgent);
      const contra = ctx.agents.find((a) => a.seatKey === "seat_contrarian");
      const meanBy = new Map<string, number>();
      for (const p of active) {
        const ss = dbVotes.filter((v) => v.proposalId === p.id).map((v) => v.score);
        meanBy.set(p.id, ss.length ? ss.reduce((a, b) => a + b, 0) / ss.length : 0);
      }
      const winnerId = breakTies(
        active.map((p) => ({
          proposalId: p.id,
          createdAt: p.createdAt,
          finalScore: scores.get(p.id) ?? 0,
          meScore: dbVotes.find((v) => v.proposalId === p.id && v.agentId === meAgent?.id)?.score ?? 0,
          meanScore: meanBy.get(p.id) ?? 0,
          contrarianScore: dbVotes.find((v) => v.proposalId === p.id && v.agentId === contra?.id)?.score ?? 0,
        })),
      );
      const dissent = collectDissent(
        dbVotes.map((v) => ({ agentId: v.agentId, proposalId: v.proposalId, score: v.score, isWinner: v.proposalId === winnerId })),
        meanBy,
      );
      const winner = active.find((p) => p.id === winnerId)!;
      let reveal: { title: string; description: string; why_it_won: string; first_steps: string[]; risks: string[] };
      try {
        const agent = ctx.agents.find((a) => a.isMeAgent) ?? ctx.agents[0];
        const req = buildRequest({ ...ctx, proposals: active.map((p) => ({ id: p.id, agentId: p.agentId, title: p.title, description: p.description, rationale: p.rationale, round: p.round, createdAt: p.createdAt })) }, agent, "reveal");
        const adapter = config.mockLlm ? new MockLLMAdapter(() => [{ kind: "text", text: JSON.stringify({ title: winner.title, description: winner.description, why_it_won: "Top weighted score.", first_steps: ["Scope v1"], risks: ["Scope creep"] }) }]) : getAdapter(agent.provider);
        const res = await adapter.complete(req, new AbortController().signal);
        reveal = extractJson(res.contentText || "{}", RevealSchema as never) as typeof reveal;
      } catch {
        reveal = {
          title: winner.title,
          description: winner.description,
          why_it_won: `Top weighted score of ${(scores.get(winnerId) ?? 0).toFixed(2)}.`,
          first_steps: ["Define v1 scope", "Ship a working slice in week one", "Get three users"],
          risks: dissent.slice(0, 4).map((d) => d.score.toString()) as unknown as string[],
        };
      }
      const texts = active.map((p) => `${p.title} ${p.description}`);
      const metrics = {
        winner_score: scores.get(winnerId) ?? 0,
        score_spread: active.length ? Math.max(...active.map((p) => scores.get(p.id) ?? 0)) - Math.min(...active.map((p) => scores.get(p.id) ?? 0)) : 0,
        me_alignment: (dbVotes.filter((v) => v.agentId === meAgent?.id).sort((a, b) => b.score - a.score)[0]?.proposalId) === winnerId,
        dissent_count: dissent.length,
        distinctness: distinctness(texts),
        total_cost_usd: run.costEstimateUsd,
      };
      await db.update(runs).set({ status: "completed", currentStep: "done", completedAt: Date.now() }).where(eq(runs.id, runId));
      await bus.publish({
        runId, type: "run.completed", step: "reveal",
        payload: { winner: { id: winnerId, ...reveal }, metrics, dissent, failedSeats: [] },
        createdAt: Date.now(),
      });
      logger.info({ runId, winnerId }, "run completed");
    }
  } catch (e) {
    const msg = (e as Error)?.message ?? "unknown";
    const code = (e as Error)?.name === "BudgetExceededError" ? "BUDGET_EXCEEDED" : "ENGINE_ERROR";
    await db.update(runs).set({ status: "failed", errorCode: code, errorMessage: msg, completedAt: Date.now() }).where(eq(runs.id, runId));
    await getBus().publish({ runId, type: "run.failed", payload: { code, message: msg }, createdAt: Date.now() });
  }
}
