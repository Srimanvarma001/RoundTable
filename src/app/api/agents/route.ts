import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";
import { normaliseWeights } from "@/lib/agents/weights";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(agents).where(eq(agents.userId, config.appUserId));
  const list = rows.map((a) => ({
    id: a.id, seatKey: a.seatKey, name: a.name, isMeAgent: !!a.isMeAgent,
    lensPrompt: a.lensPrompt, provider: a.provider, modelId: a.modelId,
    temperature: a.temperature, weight: a.weight, avatarStyle: a.avatarStyle,
    avatarSeed: a.avatarSeed, accentColor: a.accentColor, accentToken: a.accentToken,
    enabled: !!a.enabled, orderIndex: a.orderIndex,
  }));
  let normalisedWeights: Record<string, number> = {};
  try {
    const m = normaliseWeights(list.map((a) => ({ id: a.id, weight: a.weight, enabled: a.enabled })));
    normalisedWeights = Object.fromEntries(m);
  } catch { normalisedWeights = {}; }
  return NextResponse.json({ agents: list, normalisedWeights });
}
