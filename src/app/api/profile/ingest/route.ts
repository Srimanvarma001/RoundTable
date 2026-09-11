import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { profiles, profileItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";
import { ingestGithub } from "@/lib/profile/github";
import { readTasteNotes } from "@/lib/profile/notes";
import { extractItems } from "@/lib/profile/extract";
import { mergeItems } from "@/lib/profile/merge";
import { renderSummaries } from "@/lib/profile/summary";
import { hashSources } from "@/lib/profile/notes";

const Body = z.object({ source: z.string(), options: z.record(z.unknown()).optional() });

export async function POST(req: Request) {
  const { source } = Body.parse(await req.json());
  const db = getDb();
  const userId = config.appUserId;
  let raw = "";
  if (source === "github") raw = (await ingestGithub()).text;
  else if (source === "notes") raw = readTasteNotes();
  else if (source === "cv") raw = "CV ingestion via data/uploads — drop a file and re-run.";
  else if (source === "local") raw = "Local scan — configure folders on /profile.";
  else raw = `${source} source`;
  const items = await extractItems(source, raw || "(empty)");
  const existingProfiles = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const active = existingProfiles.find((p) => p.status === "active");
  const existingItems = active
    ? await db.select().from(profileItems).where(eq(profileItems.profileId, active.id))
    : [];
  const merged = mergeItems(
    existingItems.map((i) => ({ id: i.id, kind: i.kind, label: i.label, detail: i.detail, source: i.source, confidence: i.confidence, locked: !!i.locked, orderIndex: i.orderIndex })),
    items.map((i) => ({ ...i })),
  );
  const version = (active?.version ?? 0) + 1;
  const draftId = randomUUID();
  const { summaryText, authorBrief } = renderSummaries(merged.merged);
  await db.insert(profiles).values({
    id: draftId, userId, version, status: "draft",
    summaryText, authorBrief, sourceHash: hashSources({ [source]: raw } as never),
    generatedAt: Date.now(),
  });
  const now = Date.now();
  for (const [idx, m] of merged.merged.entries()) {
    await db.insert(profileItems).values({
      id: randomUUID(), profileId: draftId, kind: m.kind, label: m.label, detail: m.detail,
      source: m.source, confidence: m.confidence, locked: m.locked ? 1 : 0,
      orderIndex: idx, createdAt: now, updatedAt: now,
    });
  }
  return NextResponse.json({ draftId, itemCount: merged.merged.length, warnings: [] });
}
