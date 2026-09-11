import "server-only";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (see .env.example)`);
  return v;
}
function opt(name: string, dflt: string): string {
  return process.env[name] ?? dflt;
}
function num(name: string, dflt: number): number {
  const raw = process.env[name];
  if (!raw) return dflt;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be numeric, got ${raw}`);
  return n;
}
function bool(name: string, dflt: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return dflt;
  return raw === "true" || raw === "1";
}

/** Single module allowed to read process.env (server-only). */
export const config = {
  get deepseekApiKey(): string | undefined {
    return process.env.DEEPSEEK_API_KEY || undefined;
  },
  get glmApiKey(): string | undefined {
    return process.env.GLM_API_KEY || undefined;
  },
  get tavilyApiKey(): string | undefined {
    return process.env.TAVILY_API_KEY || undefined;
  },
  get githubToken(): string | undefined {
    return process.env.GITHUB_TOKEN || undefined;
  },
  deepseekBaseUrl: opt("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
  glmBaseUrl: opt("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4"),
  /** User requested DeepSeek V4 Flash across DeepSeek seats. */
  deepseekChatModel: opt("DEEPSEEK_MODEL_CHAT", "deepseek-v4-flash"),
  deepseekReasoningModel: opt("DEEPSEEK_MODEL_REASONING", "deepseek-v4-flash"),
  /** User requested GLM flash family. Override with GLM_MODEL=glm-5.x-flash when available. */
  glmModel: opt("GLM_MODEL", "glm-4-flash"),
  githubUsername: opt("GITHUB_USERNAME", ""),
  databaseUrl: opt("DATABASE_URL", "file:./data/roundtable.db"),
  appUserId: opt("APP_USER_ID", "local-user"),
  searchProvider: opt("SEARCH_PROVIDER", "tavily") as "tavily" | "stub",
  runBudgetUsd: num("RUN_BUDGET_USD", 1.0),
  runMaxTokens: num("RUN_MAX_TOKENS", 250000),
  runMaxCalls: num("RUN_MAX_CALLS", 60),
  logLevel: opt("LOG_LEVEL", "info"),
  mockLlm: bool("MOCK_LLM", false),
  requireDeepseekKey(): string {
    return req("DEEPSEEK_API_KEY");
  },
  requireGlmKey(): string {
    return req("GLM_API_KEY");
  },
};

export type AppConfig = typeof config;
