import { randomUUID } from "node:crypto";
import { getDb } from "../src/lib/db/client";
import { users, agents, modelPricing, profiles } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { SEAT_DEFAULTS } from "../src/lib/agents/defaults";
import { DEFAULT_PRICING } from "../src/lib/llm/pricing";
import { config } from "../src/lib/config";

async function main() {
  const db = getDb();
  const now = Date.now();
  const userId = config.appUserId;
  const u = await db.select().from(users).where(eq(users.id, userId));
  if (!u.length) {
    await db.insert(users).values({ id: userId, displayName: "Local User", createdAt: now });
    console.log(`seeded user ${userId}`);
  }
  const existing = await db.select().from(agents).where(eq(agents.userId, userId));
  if (!existing.length) {
    for (const s of SEAT_DEFAULTS) {
      await db.insert(agents).values({
        id: randomUUID(), userId, seatKey: s.seatKey, name: s.name,
        isMeAgent: s.isMeAgent ? 1 : 0, lensPrompt: s.lensPrompt,
        provider: s.provider, modelId: s.modelId, temperature: s.temperature,
        weight: s.weight, avatarStyle: s.avatarStyle, avatarSeed: s.seatKey,
        accentColor: s.accentColor, accentToken: s.accentToken,
        enabled: 1, orderIndex: s.orderIndex, createdAt: now, updatedAt: now,
      });
    }
    console.log("seeded 8 seats (deepseek-v4-flash + glm flash family)");
  }
  for (const p of DEFAULT_PRICING) {
    try {
      await db.insert(modelPricing).values({ ...p, updatedAt: now });
    } catch { /* already seeded */ }
  }
  const profs = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!profs.length) {
    await db.insert(profiles).values({
      id: randomUUID(), userId, version: 1, status: "active",
      summaryText: "A generalist builder. Edit on /profile.",
      authorBrief: "A generalist builder.",
      sourceHash: "", generatedAt: now,
    });
    console.log("seeded empty active profile");
  }
  console.log("seed done");
}

main().catch((e) => { console.error(e); process.exit(1); });
