import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("draft"),
  summaryText: text("summary_text").notNull().default(""),
  authorBrief: text("author_brief").notNull().default(""),
  sourceHash: text("source_hash").notNull().default(""),
  generatedAt: integer("generated_at").notNull(),
  lastManualEditAt: integer("last_manual_edit_at"),
});

export const profileItems = sqliteTable("profile_items", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  detail: text("detail").notNull().default(""),
  source: text("source").notNull().default("manual"),
  confidence: real("confidence").notNull().default(1.0),
  locked: integer("locked").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  seatKey: text("seat_key").notNull(),
  name: text("name").notNull(),
  isMeAgent: integer("is_me_agent").notNull().default(0),
  lensPrompt: text("lens_prompt").notNull().default(""),
  provider: text("provider").notNull().default("deepseek"),
  modelId: text("model_id").notNull().default("deepseek-v4-flash"),
  temperature: real("temperature").notNull().default(0.7),
  weight: real("weight").notNull().default(0.1),
  avatarStyle: text("avatar_style").notNull().default("dicebear"),
  avatarSeed: text("avatar_seed").notNull().default(""),
  avatarSvgCache: text("avatar_svg_cache"),
  accentColor: text("accent_color").notNull().default("#60A5FA"),
  accentToken: text("accent_token").notNull().default("--seat-5"),
  enabled: integer("enabled").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  seedPrompt: text("seed_prompt").notNull(),
  seedMode: text("seed_mode").notNull().default("vague"),
  status: text("status").notNull().default("created"),
  currentStep: text("current_step").notNull().default("propose"),
  stepIndex: integer("step_index").notNull().default(0),
  round: integer("round").notNull().default(1),
  profileId: text("profile_id"),
  agentSnapshot: text("agent_snapshot").notNull().default("[]"),
  configSnapshot: text("config_snapshot").notNull().default("{}"),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costEstimateUsd: real("cost_estimate_usd").notNull().default(0),
  llmCalls: integer("llm_calls").notNull().default(0),
  pauseRequested: integer("pause_requested").notNull().default(0),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: integer("started_at"),
  completedAt: integer("completed_at"),
  createdAt: integer("created_at").notNull(),
});

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  agentId: text("agent_id").notNull(),
  round: integer("round").notNull().default(1),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  rationale: text("rationale").notNull().default(""),
  parentProposalId: text("parent_proposal_id"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
});

export const critiques = sqliteTable("critiques", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  agentId: text("agent_id").notNull(),
  targetProposalId: text("target_proposal_id").notNull(),
  stance: text("stance").notNull(),
  comment: text("comment").notNull(),
  round: integer("round").notNull().default(1),
  createdAt: integer("created_at").notNull(),
});

export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  agentId: text("agent_id").notNull(),
  proposalId: text("proposal_id").notNull(),
  score: integer("score").notNull(),
  weightAtVote: real("weight_at_vote").notNull(),
  weightedScore: real("weighted_score").notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const runEvents = sqliteTable("run_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id").notNull(),
  seq: integer("seq").notNull(),
  type: text("type").notNull(),
  agentId: text("agent_id"),
  step: text("step"),
  payload: text("payload").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

export const agentMessages = sqliteTable("agent_messages", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  agentId: text("agent_id").notNull(),
  step: text("step").notNull(),
  taskKey: text("task_key").notNull().unique(),
  requestJson: text("request_json").notNull().default("{}"),
  reasoningText: text("reasoning_text").notNull().default(""),
  contentText: text("content_text").notNull().default(""),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  finishReason: text("finish_reason").notNull().default("stop"),
  error: text("error"),
  createdAt: integer("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const modelPricing = sqliteTable(
  "model_pricing",
  {
    provider: text("provider").notNull(),
    modelId: text("model_id").notNull(),
    inputPerMtokUsd: real("input_per_mtok_usd").notNull(),
    outputPerMtokUsd: real("output_per_mtok_usd").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.modelId] })],
);
