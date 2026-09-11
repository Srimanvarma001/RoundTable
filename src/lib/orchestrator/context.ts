import type { StepName } from "@/shared/constants";
import type { AgentDTO } from "@/shared/types";
import { SYSTEM_CONTRACT, STEP_INSTRUCTIONS } from "../agents/defaults";
import type { AgentCallRequest } from "../llm/types";

export interface RunContext {
  runId: string;
  seedPrompt: string;
  seedMode: string;
  agents: AgentDTO[];
  authorBrief: string;
  profileSummary: string;
  searchSnippets?: string;
  proposals: Array<{ id: string; agentId: string; title: string; description: string; rationale: string; round: number; createdAt: number }>;
  critiques: Array<{ agentId: string; targetProposalId: string; stance: string; comment: string }>;
}

export function fillTemplate(t: string, vars: Record<string, string>): string {
  let out = t;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}

/** Four-layer prompt: system contract → lens → author snapshot → step context. */
export function buildRequest(
  ctx: RunContext,
  agent: AgentDTO,
  step: StepName,
): AgentCallRequest {
  const system = SYSTEM_CONTRACT.replace("{seat name}", agent.name);
  const snapshot = agent.isMeAgent ? ctx.profileSummary : ctx.authorBrief;
  let task = "";
  if (step === "propose") {
    task = fillTemplate(STEP_INSTRUCTIONS.propose, {
      seed: ctx.seedPrompt,
      mode: ctx.seedMode,
      brief: snapshot,
      n: "1-2",
    });
  } else if (step === "debate") {
    const list = ctx.proposals.map((p) => `"${p.title}": ${p.description}`).join("\n");
    task = fillTemplate(STEP_INSTRUCTIONS.debate, { seed: ctx.seedPrompt, proposals: list, n: "2-3" });
  } else if (step === "vote") {
    const list = ctx.proposals.map((p) => `"${p.title}": ${p.description}`).join("\n");
    task = fillTemplate(STEP_INSTRUCTIONS.vote, { seed: ctx.seedPrompt, proposals: list });
  } else if (step === "refine") {
    const mine = ctx.proposals.filter((p) => p.agentId === agent.id);
    const mineTxt = mine.map((p) => `"${p.title}": ${p.description}`).join("\n") || "(none)";
    const crit = ctx.critiques.filter((c) => mine.some((m) => m.id === c.targetProposalId));
    const critTxt = crit.map((c) => `- ${c.comment}`).join("\n") || "(no critiques)";
    task = fillTemplate(STEP_INSTRUCTIONS.refine, { proposal: mineTxt, critiques: critTxt });
  } else {
    task = fillTemplate(STEP_INSTRUCTIONS.reveal, {
      proposal: ctx.proposals[0]?.title ?? "",
      scores: "",
      dissent: "",
    });
  }
  const searchBlock =
    agent.seatKey === "seat_trend" && ctx.searchSnippets
      ? `\n\nLive search results:\n${ctx.searchSnippets}`
      : "";
  const maxTokens =
    step === "propose" || step === "refine" ? 800 : step === "debate" ? 500 : step === "vote" ? 600 : 1200;
  return {
    provider: agent.provider,
    modelId: agent.modelId,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Role lens:\n${agent.lensPrompt}\n\nAuthor snapshot:\n${snapshot}\n\nTask:\n${task}${searchBlock}` },
    ],
    temperature: agent.temperature,
    maxTokens,
    jsonMode: true,
    reasoning: agent.isMeAgent,
  };
}
