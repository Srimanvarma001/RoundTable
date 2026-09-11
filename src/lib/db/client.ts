import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { config } from "../config";
import fs from "node:fs";
import path from "node:path";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;

function sqliteUrl(): string {
  const url = config.databaseUrl;
  const m = url.match(/^file:(.+)$/);
  const p = m ? m[1] : "./data/roundtable.db";
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  return `file:${abs}`;
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (db) return db;
  client = createClient({ url: sqliteUrl() });
  db = drizzle(client, { schema });
  void ensureDb();
  return db;
}

/** Awaitable table init. Call before first query when racing boot (tests, instrumentation). */
let ready: Promise<void> | null = null;
export function ensureDb(): Promise<void> {
  if (!client) getDb();
  if (!ready) ready = ensureTables();
  return ready;
}

let ensured = false;
async function ensureTables(): Promise<void> {
  if (ensured || !client) return;
  ensured = true;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'draft', summary_text TEXT NOT NULL DEFAULT '', author_brief TEXT NOT NULL DEFAULT '', source_hash TEXT NOT NULL DEFAULT '', generated_at INTEGER NOT NULL, last_manual_edit_at INTEGER)`,
    `CREATE TABLE IF NOT EXISTS profile_items (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'manual', confidence REAL NOT NULL DEFAULT 1.0, locked INTEGER NOT NULL DEFAULT 0, order_index INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, seat_key TEXT NOT NULL, name TEXT NOT NULL, is_me_agent INTEGER NOT NULL DEFAULT 0, lens_prompt TEXT NOT NULL DEFAULT '', provider TEXT NOT NULL DEFAULT 'deepseek', model_id TEXT NOT NULL DEFAULT 'deepseek-v4-flash', temperature REAL NOT NULL DEFAULT 0.7, weight REAL NOT NULL DEFAULT 0.1, avatar_style TEXT NOT NULL DEFAULT 'dicebear', avatar_seed TEXT NOT NULL DEFAULT '', avatar_svg_cache TEXT, accent_color TEXT NOT NULL DEFAULT '#60A5FA', accent_token TEXT NOT NULL DEFAULT '--seat-5', enabled INTEGER NOT NULL DEFAULT 1, order_index INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, seed_prompt TEXT NOT NULL, seed_mode TEXT NOT NULL DEFAULT 'vague', status TEXT NOT NULL DEFAULT 'created', current_step TEXT NOT NULL DEFAULT 'propose', step_index INTEGER NOT NULL DEFAULT 0, round INTEGER NOT NULL DEFAULT 1, profile_id TEXT, agent_snapshot TEXT NOT NULL DEFAULT '[]', config_snapshot TEXT NOT NULL DEFAULT '{}', tokens_in INTEGER NOT NULL DEFAULT 0, tokens_out INTEGER NOT NULL DEFAULT 0, cost_estimate_usd REAL NOT NULL DEFAULT 0, llm_calls INTEGER NOT NULL DEFAULT 0, pause_requested INTEGER NOT NULL DEFAULT 0, error_code TEXT, error_message TEXT, started_at INTEGER, completed_at INTEGER, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, agent_id TEXT NOT NULL, round INTEGER NOT NULL DEFAULT 1, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', rationale TEXT NOT NULL DEFAULT '', parent_proposal_id TEXT, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS critiques (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, agent_id TEXT NOT NULL, target_proposal_id TEXT NOT NULL, stance TEXT NOT NULL, comment TEXT NOT NULL, round INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS votes (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, agent_id TEXT NOT NULL, proposal_id TEXT NOT NULL, score INTEGER NOT NULL, weight_at_vote REAL NOT NULL, weighted_score REAL NOT NULL, comment TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS run_events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL, seq INTEGER NOT NULL, type TEXT NOT NULL, agent_id TEXT, step TEXT, payload TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_run_events_run_seq ON run_events(run_id, seq)`,
    `CREATE TABLE IF NOT EXISTS agent_messages (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, agent_id TEXT NOT NULL, step TEXT NOT NULL, task_key TEXT NOT NULL UNIQUE, request_json TEXT NOT NULL DEFAULT '{}', reasoning_text TEXT NOT NULL DEFAULT '', content_text TEXT NOT NULL DEFAULT '', tokens_in INTEGER NOT NULL DEFAULT 0, tokens_out INTEGER NOT NULL DEFAULT 0, cost_usd REAL NOT NULL DEFAULT 0, latency_ms INTEGER NOT NULL DEFAULT 0, finish_reason TEXT NOT NULL DEFAULT 'stop', error TEXT, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS model_pricing (provider TEXT NOT NULL, model_id TEXT NOT NULL, input_per_mtok_usd REAL NOT NULL, output_per_mtok_usd REAL NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (provider, model_id))`,
  ];
  for (const s of stmts) {
    try {
      await client.execute(s);
    } catch { /* exists / race */ }
  }
}
