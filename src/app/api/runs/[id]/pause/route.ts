import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  await db.update(runs).set({ pauseRequested: 1 }).where(eq(runs.id, id));
  const r = (await db.select().from(runs).where(eq(runs.id, id)))[0];
  return NextResponse.json({ status: r?.status ?? "unknown" }, { status: 202 });
}
