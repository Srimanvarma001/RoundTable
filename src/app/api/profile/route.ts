import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { profiles, profileItems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { config } from "@/lib/config";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.userId, config.appUserId)).orderBy(desc(profiles.version));
  const active = rows.find((r) => r.status === "active") ?? rows[0] ?? null;
  const items = active
    ? await db.select().from(profileItems).where(eq(profileItems.profileId, active.id))
    : [];
  return NextResponse.json({
    profile: active
      ? { id: active.id, version: active.version, summaryText: active.summaryText, authorBrief: active.authorBrief }
      : null,
    items: items.map((i) => ({
      id: i.id, kind: i.kind, label: i.label, detail: i.detail, source: i.source,
      confidence: i.confidence, locked: !!i.locked,
    })),
    ingestRuns: [],
  });
}
