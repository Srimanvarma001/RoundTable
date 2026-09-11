import { z } from "zod";
import { ProposeSchema, DebateSchema, RefineSchema, VoteSchema, extractJson } from "../../llm/json";
import { buildRequest, type RunContext } from "../context";
import { taskKey } from "../taskKey";
import type { AgentCallResult, LLMAdapter } from "../../llm/types";
import type { StepName } from "@/shared/constants";

export interface StepTask {
  agentId: string;
  taskKey: string;
  step: StepName;
  request: ReturnType<typeof buildRequest>;
  parse: (text: string) => unknown;
}

export function proposeTasks(ctx: RunContext): StepTask[] {
  return ctx.agents
    .filter((a) => a.enabled)
    .map((a) => ({
      agentId: a.id,
      taskKey: taskKey(ctx.runId, "propose", a.id, 1),
      step: "propose" as StepName,
      request: buildRequest(ctx, a, "propose"),
      parse: (t: string) => extractJson(t, ProposeSchema),
    }));
}

export function debateTasks(ctx: RunContext): StepTask[] {
  return ctx.agents
    .filter((a) => a.enabled)
    .map((a) => ({
      agentId: a.id,
      taskKey: taskKey(ctx.runId, "debate", a.id, 1),
      step: "debate" as StepName,
      request: buildRequest(ctx, a, "debate"),
      parse: (t: string) => extractJson(t, DebateSchema),
    }));
}

export function refineTasks(ctx: RunContext): StepTask[] {
  const critTargets = new Set(ctx.critiques.map((c) => c.targetProposalId));
  const seats = ctx.agents.filter(
    (a) => a.enabled && ctx.proposals.some((p) => p.agentId === a.id && critTargets.has(p.id)),
  ).slice(0, 4);
  return seats.map((a) => ({
    agentId: a.id,
    taskKey: taskKey(ctx.runId, "refine", a.id, 2),
    step: "refine" as StepName,
    request: buildRequest(ctx, a, "refine"),
    parse: (t: string) => extractJson(t, RefineSchema),
  }));
}

export function voteTasks(ctx: RunContext): StepTask[] {
  return ctx.agents
    .filter((a) => a.enabled)
    .map((a) => ({
      agentId: a.id,
      taskKey: taskKey(ctx.runId, "vote", a.id, 1),
      step: "vote" as StepName,
      request: buildRequest(ctx, a, "vote"),
      parse: (t: string) => extractJson(t, VoteSchema),
    }));
}

export const stepSchemas = { ProposeSchema, DebateSchema, RefineSchema, VoteSchema };
export type { AgentCallResult, LLMAdapter };
export { z };
