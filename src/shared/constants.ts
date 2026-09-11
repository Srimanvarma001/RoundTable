export const STEP_ORDER = ["propose", "debate", "refine", "vote", "reveal", "done"] as const;
export type StepName = (typeof STEP_ORDER)[number];

export const RUN_STATUSES = [
  "created",
  "running",
  "paused",
  "completed",
  "failed",
  "aborted",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const PROVIDERS = ["deepseek", "glm", "mock"] as const;
export type ProviderKey = (typeof PROVIDERS)[number];

export const DEFAULT_BUDGET_USD = 1.0;
export const DEFAULT_MAX_TOKENS = 250000;
export const DEFAULT_MAX_CALLS = 60;
export const STAGGER_DEFAULT_MS = 45;
export const STAGGER_HIGH_WATER_CHARS = 4000;
