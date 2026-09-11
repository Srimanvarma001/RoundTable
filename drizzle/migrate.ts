import { getDb } from "../src/lib/db/client";

async function main() {
  getDb();
  // tables are auto-created by ensureTables in client.ts (libsql, no native build)
  await new Promise((r) => setTimeout(r, 500));
  console.log("migrations applied (ensureTables)");
}

main().catch((e) => { console.error(e); process.exit(1); });
