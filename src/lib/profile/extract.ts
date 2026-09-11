import { ProfileExtractSchema } from "../llm/json";
import { getAdapter } from "../llm/registry";
import { MockLLMAdapter } from "../llm/mock";
import { config } from "../config";
import { extractJson } from "../llm/json";

export interface ExtractedItem {
  kind: string;
  label: string;
  detail: string;
  confidence: number;
  source: string;
}

/** One LLM call per source, temp 0.2, jsonMode, cap 12 items, conservative. */
export async function extractItems(source: string, rawText: string): Promise<ExtractedItem[]> {
  const prompt = `From the following ${source} text, extract up to 12 structured profile items (skills, projects, tastes, experience, constraints, goals, anti_patterns). Be conservative: emit nothing rather than speculate. Inferred tastes/anti-patterns get confidence below 0.8.\n\nTEXT:\n${rawText.slice(0, 12000)}\n\nReturn {"items":[{"kind","label","detail","confidence"}]}.`;
  const useMock = config.mockLlm || (!config.deepseekApiKey && !config.glmApiKey);
  const adapter = useMock
    ? new MockLLMAdapter(() => [{ kind: "text", text: '{"items":[]}' }])
    : getAdapter(config.deepseekApiKey ? "deepseek" : "glm");
  const res = await adapter.complete(
    {
      provider: "mock",
      modelId: "extract",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      maxTokens: 800,
      jsonMode: true,
    } as never,
    new AbortController().signal,
  );
  try {
    const parsed = extractJson(res.contentText || '{"items":[]}', ProfileExtractSchema);
    return parsed.items.map((i) => ({ ...i, source }));
  } catch {
    return [];
  }
}
