/** Token price table + cost estimation. Prices seeded by scripts/seed.ts; /settings shows last-updated. */
export interface PriceRow {
  provider: string;
  modelId: string;
  inputPerMtokUsd: number;
  outputPerMtokUsd: number;
}

// Checked 2026-09-11. Flash models are the cheap tier on both providers.
export const DEFAULT_PRICING: PriceRow[] = [
  { provider: "deepseek", modelId: "deepseek-v4-flash", inputPerMtokUsd: 0.27, outputPerMtokUsd: 1.1 },
  { provider: "deepseek", modelId: "deepseek-v4-pro", inputPerMtokUsd: 2.0, outputPerMtokUsd: 3.0 },
  // legacy ids kept so old snapshots still price
  { provider: "deepseek", modelId: "deepseek-chat", inputPerMtokUsd: 0.27, outputPerMtokUsd: 1.1 },
  { provider: "deepseek", modelId: "deepseek-reasoner", inputPerMtokUsd: 0.55, outputPerMtokUsd: 2.19 },
  { provider: "glm", modelId: "glm-4-flash", inputPerMtokUsd: 0.1, outputPerMtokUsd: 0.1 },
  { provider: "glm", modelId: "glm-4.6", inputPerMtokUsd: 0.5, outputPerMtokUsd: 1.5 },
  { provider: "glm", modelId: "glm-5-flash", inputPerMtokUsd: 0.2, outputPerMtokUsd: 0.4 },
  { provider: "mock", modelId: "mock", inputPerMtokUsd: 0, outputPerMtokUsd: 0 },
];

export function estimateCost(
  provider: string,
  modelId: string,
  tokensIn: number,
  tokensOut: number,
  table: PriceRow[] = DEFAULT_PRICING,
): number {
  const row =
    table.find((r) => r.provider === provider && r.modelId === modelId) ??
    table.find((r) => r.provider === provider);
  if (!row) return 0;
  return (
    (tokensIn / 1_000_000) * row.inputPerMtokUsd +
    (tokensOut / 1_000_000) * row.outputPerMtokUsd
  );
}

/** Fallback when provider omits usage on stream: chars/4 rounded up. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
