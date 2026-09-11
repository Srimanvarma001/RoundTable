/** CLI: full headless run against real or mock APIs. MOCK_LLM=true for token-free. */
import { createRun, runLoop } from "../src/lib/orchestrator/engine";
import { getDb } from "../src/lib/db/client";
import { runs } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const seed = process.argv[2] ?? "A CLI habit tracker I will actually use";
  console.log(`seed: ${seed} (MOCK_LLM=${process.env.MOCK_LLM})`);
  const runId = await createRun({ seedPrompt: seed });
  console.log(`run ${runId} — starting…`);
  await runLoop(runId);
  const db = getDb();
  const r = (await db.select().from(runs).where(eq(runs.id, runId)))[0];
  console.log(`status=${r.status} calls=${r.llmCalls} cost=$${r.costEstimateUsd.toFixed(4)} tokens=${r.tokensIn + r.tokensOut}`);
  if (r.status !== "completed") {
    console.log(`error: ${r.errorCode} ${r.errorMessage}`);
    process.exit(2);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
