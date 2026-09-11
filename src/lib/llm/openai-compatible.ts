import OpenAI from "openai";
import { config } from "../config";
import type {
  AgentCallRequest,
  AgentCallResult,
  LLMAdapter,
  LLMDelta,
} from "./types";
import { MissingProviderKeyError, ProviderError } from "./types";
import { estimateTokens } from "./pricing";

/**
 * Single adapter for both providers (both OpenAI-compatible).
 * DeepSeek seats use deepseek-v4-flash with thinking on/off (reasoning flag);
 * GLM seats use GLM_MODEL (default glm-4-flash, user asked for flash family).
 */
export class OpenAICompatibleAdapter implements LLMAdapter {
  constructor(
    private baseURL: string,
    private apiKey: string,
    private provider: "deepseek" | "glm",
  ) {}

  private client(): OpenAI {
    return new OpenAI({ baseURL: this.baseURL, apiKey: this.apiKey });
  }

  async *stream(req: AgentCallRequest, signal: AbortSignal): AsyncIterable<LLMDelta> {
    const client = this.client();
    let stream;
    try {
      const body: Record<string, unknown> = {
        model: req.modelId,
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      };
      // DeepSeek V4 thinking toggle; GLM thinking toggle
      if (this.provider === "deepseek") {
        body.thinking = { type: req.reasoning ? "enabled" : "disabled" };
        if (req.jsonMode && !req.reasoning) body.response_format = { type: "json_object" };
      } else {
        if (req.reasoning) body.thinking = { type: "enabled" };
        if (req.jsonMode) body.response_format = { type: "json_object" };
      }
      stream = (await client.chat.completions.create(body as never, { signal })) as unknown as AsyncIterable<unknown>;
    } catch (e) {
      throw classify(e);
    }
    try {
      for await (const chunk of stream as AsyncIterable<Record<string, unknown>>) {
        const choice = (chunk.choices as Array<Record<string, unknown>>)?.[0];
        const delta = (choice?.delta ?? {}) as Record<string, unknown>;
        // DeepSeek: delta.reasoning_content ; GLM: delta.reasoning_content | reasoning
        const reasoning =
          (delta.reasoning_content as string) ??
          (delta.reasoning as string) ??
          ((delta.thinking as Record<string, unknown>)?.content as string);
        const text = (delta.content as string) ?? "";
        if (typeof reasoning === "string" && reasoning) yield { kind: "reasoning", text: reasoning };
        if (typeof text === "string" && text) yield { kind: "text", text };
      }
    } catch (e) {
      throw classify(e);
    }
  }

  async complete(req: AgentCallRequest, signal: AbortSignal): Promise<AgentCallResult> {
    const t0 = Date.now();
    let reasoningText = "";
    let contentText = "";
    for await (const d of this.stream(req, signal)) {
      if (d.kind === "reasoning") reasoningText += d.text;
      else contentText += d.text;
    }
    const tokensIn = estimateTokens(JSON.stringify(req.messages));
    const tokensOut = estimateTokens(reasoningText + contentText);
    return {
      reasoningText,
      contentText,
      tokensIn,
      tokensOut,
      finishReason: "stop",
      latencyMs: Date.now() - t0,
    };
  }
}

function classify(e: unknown): ProviderError {
  const err = e as { status?: number; message?: string };
  const status = err?.status ?? 0;
  const msg = err?.message ?? "provider error";
  if (status === 429) return new ProviderError("RATE_LIMIT", msg, true);
  if (status >= 500) return new ProviderError("SERVER", msg, true);
  if (status >= 400) return new ProviderError("CLIENT", msg, false);
  if (/abort|aborted/i.test(msg)) return new ProviderError("ABORT", msg, false);
  return new ProviderError("NETWORK", msg, true);
}

const memo = new Map<string, OpenAICompatibleAdapter>();

export function getAdapter(provider: "deepseek" | "glm" | "mock"): LLMAdapter {
  if (provider === "mock") throw new Error("use MockLLMAdapter directly for mock");
  if (provider === "deepseek") {
    const key = config.deepseekApiKey;
    if (!key) throw new MissingProviderKeyError("deepseek");
    const k = `deepseek:${config.deepseekBaseUrl}`;
    if (!memo.has(k)) memo.set(k, new OpenAICompatibleAdapter(config.deepseekBaseUrl, key, "deepseek"));
    return memo.get(k)!;
  }
  const key = config.glmApiKey;
  if (!key) throw new MissingProviderKeyError("glm");
  const k = `glm:${config.glmBaseUrl}`;
  if (!memo.has(k)) memo.set(k, new OpenAICompatibleAdapter(config.glmBaseUrl, key, "glm"));
  return memo.get(k)!;
}
