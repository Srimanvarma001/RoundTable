import type {
  AgentCallRequest,
  AgentCallResult,
  LLMAdapter,
  LLMDelta,
} from "./types";

/** Step-aware default script: returns schema-valid payloads per step instruction. */
export function defaultScript(req: AgentCallRequest): LLMDelta[] {
  const text = req.messages.map((m) => m.content).join("\n");
  if (text.includes("debate JSON")) {
    return [{
      kind: "text",
      text: '{"critiques":[{"target_title":"Mock Idea A","stance":"attack","comment":"Mock critique: scope risk in week three."},{"target_title":"Mock Idea B","stance":"support","comment":"Mock critique: small and shippable."}]}',
    }];
  }
  if (text.includes("refine JSON")) {
    return [{ kind: "text", text: '{"refined":null}' }];
  }
  if (text.includes("vote JSON")) {
    return [{
      kind: "text",
      text: '{"votes":[{"proposal_title":"Mock Idea A","score":8,"comment":"Mock vote: fits the brief."},{"proposal_title":"Mock Idea B","score":6,"comment":"Mock vote: decent backup."}]}',
    }];
  }
  // propose JSON (and fallback)
  return [{
    kind: "text",
    text: '{"proposals":[{"title":"Mock Idea A","description":"A scripted idea for tests, one sentence of what it does.","rationale":"Mock lens favours small scope."},{"title":"Mock Idea B","description":"A second scripted idea for tests, equally small.","rationale":"Mock lens favours backups."}]}',
  }];
}

/** Scripted adapter for tests + offline dev (MOCK_LLM=true). Records every request. */
export class MockLLMAdapter implements LLMAdapter {
  requests: AgentCallRequest[] = [];
  /** fn receives request, returns scripted deltas */
  constructor(
    private script: (req: AgentCallRequest) => LLMDelta[] = defaultScript,
    private failMode: "none" | "always" | "bad-json" = "none",
    private latencyMs = 0,
  ) {}

  async *stream(
    req: AgentCallRequest,
    _signal: AbortSignal,
  ): AsyncIterable<LLMDelta> {
    this.requests.push(req);
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
    if (this.failMode === "always") {
      const e = new Error("mock provider outage") as Error & { retryable: boolean };
      e.retryable = true;
      throw e;
    }
    const deltas =
      this.failMode === "bad-json"
        ? [{ kind: "text" as const, text: "not json at all {{{" }]
        : this.script(req);
    for (const d of deltas) yield d;
  }

  async complete(req: AgentCallRequest, signal: AbortSignal): Promise<AgentCallResult> {
    let reasoningText = "";
    let contentText = "";
    for await (const d of this.stream(req, signal)) {
      if (d.kind === "reasoning") reasoningText += d.text;
      else contentText += d.text;
    }
    return {
      reasoningText,
      contentText,
      tokensIn: Math.ceil(JSON.stringify(req.messages).length / 4),
      tokensOut: Math.ceil(contentText.length / 4),
      finishReason: "stop",
      latencyMs: this.latencyMs,
    };
  }
}
