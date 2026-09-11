# Round Table — Weighted Multi-Agent Idea Generator

Eight AI agents around a virtual round table. Seven lens seats + the **Me Agent** (25% vote weight) built from your GitHub, CV, local projects, and taste notes.

- **Models:** DeepSeek `deepseek-v4-flash` (thinking on for Me/reveal, off for chat seats) + GLM flash family (`GLM_MODEL`, default `glm-4-flash` — set to `glm-5.x-flash` when available). One OpenAI-compatible adapter serves both.
- **Stack:** Next.js App Router + TypeScript, SQLite via Drizzle, SSE streaming, Framer Motion table.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in keys (never commit .env.local)
npm run seed
npm run dev                  # → /run
```

Env (all via `src/lib/config.ts`, server-only):

| Var | Purpose | Default |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek key | — |
| `DEEPSEEK_BASE_URL` | override | `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL_CHAT` / `DEEPSEEK_MODEL_REASONING` | model ids | `deepseek-v4-flash` |
| `GLM_API_KEY` | Zhipu key | — |
| `GLM_BASE_URL` | override | `https://open.bigmodel.cn/api/paas/v4` |
| `GLM_MODEL` | GLM flash model | `glm-4-flash` |
| `TAVILY_API_KEY` / `SEARCH_PROVIDER` | Trend-Watcher search | `tavily` (`stub` offline) |
| `GITHUB_TOKEN` / `GITHUB_USERNAME` | profile ingestion | — |
| `MOCK_LLM` | force mock adapter | `false` |

## First generation

1. `npm run seed` → 8 seats + pricing + empty profile.
2. Fill `/profile` (GitHub ingest, taste notes, lock items).
3. Open `/run`, type a seed, hit Generate. Stop pauses (never aborts mid-call), Resume continues idempotently.
4. Reveal card → export MD/JSON, replay token-free at `/runs/[id]`, compare at `/runs/compare?a=&b=`.

## Commands

```bash
npm test            # vitest unit + integration
npm run typecheck   # tsc --noEmit
npm run seed
npm run ingest-profile
npm run smoke       # real APIs, one full run
MOCK_LLM=true npm run smoke   # token-free
```

Screenshots: run `/run` for the table, complete a run for the reveal card.
