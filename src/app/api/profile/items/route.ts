import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { profiles, profileItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";
import { renderSummaries } from "@/lib/profile/summary";

async function activeProfileId(): Promise<string> {
  const db = getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.userId, config.appUserId));
  let active = rows.find((r) => r.status === "active");
  if (!active) {
    const id = randomUUID();
    await db.insert(profiles).values({
      id, userId: config.appUserId, version: 1, status: "active",
      summaryText: "", authorBrief: "", sourceHash: "", generatedAt: Date.now(),
    });
    return id;
  }
  return active.id;
}

async function refreshSummaries(profileId: string) {
  const db = getDb();
  const items = await db.select().from(profileItems).where(eq(profileItems.profileId, profileId));
  const { summaryText, authorBrief } = renderSummaries(
    items.map((i) => ({ id: i.id, kind: i.kind, label: i.label, detail: i.detail, source: i.source, confidence: i.confidence, locked: !!i.locked, orderIndex: i.orderIndex })),
  );
  await db.update(profiles).set({ summaryText, authorBrief }).where(eq(profiles.id, profileId));
}

const NewItem = z.object({
  kind: z.string(), label: z.string(), detail: z.string().default(""),
  source: z.string().default("manual"), confidence: z.number().default(1.0),
});

export async function POST(req: Request) {
  const body = NewItem.parse(await req.json());
  const db = getDb();
  const pid = await activeProfileId();
  const id = randomUUID();
  const now = Date.now();
  await db.insert(profileItems).values({
    id, profileId: pid, kind: body.kind, label: body.label, detail: body.detail,
    source: body.source, confidence: body.confidence, locked: 0, orderIndex: 0,
    createdAt: now, updatedAt: now,
  });
  await refreshSummaries(pid);
  return NextResponse.json({ item: { id, ...body } }, { status: 201 });
}
