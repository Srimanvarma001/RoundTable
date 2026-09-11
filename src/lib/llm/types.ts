export type DeltaKind = "reasoning" | "text";

export interface LLMDelta {
  kind: DeltaKind;
  text: string;
}

export interface AgentCallRequest {
  provider: "deepseek" | "glm" | "mock";
  modelId: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature: number;
  maxTokens: number;
  jsonMode?: boolean;
  reasoning?: boolean;
}

export interface AgentCallResult {
  reasoningText: string;
  contentText: string;
  tokensIn: number;
  tokensOut: number;
  finishReason: string;
  latencyMs: number;
}

export interface LLMAdapter {
  stream(req: AgentCallRequest, signal: AbortSignal): AsyncIterable<LLMDelta>;
  complete(req: AgentCallRequest, signal: AbortSignal): Promise<AgentCallResult>;
}

export class ProviderError extends Error {
  retryable: boolean;
  code: string;
  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}

export class MissingProviderKeyError extends Error {
  provider: string;
  constructor(provider: string) {
    super(`Missing API key for provider ${provider}`);
    this.name = "MissingProviderKeyError";
    this.provider = provider;
  }
}

export class StructuredOutputError extends Error {
  raw: string;
  constructor(raw: string) {
    super("Model output failed schema validation twice");
    this.name = "StructuredOutputError";
    this.raw = raw;
  }
}

export class BudgetExceededError extends Error {
  constructor() {
    super("Run budget exceeded");
    this.name = "BudgetExceededError";
  }
}
