import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";

export async function POST(req: Request) {
  const { draftId } = z.object({ draftId: z.string() }).parse(await req.json());
  const db = getDb();
  await db.update(profiles).set({ status: "archived" }).where(eq(profiles.userId, config.appUserId));
  await db.update(profiles).set({ status: "active" }).where(eq(profiles.id, draftId));
  const rows = await db.select().from(profiles).where(eq(profiles.id, draftId));
  return NextResponse.json({ profile: rows[0] });
}
