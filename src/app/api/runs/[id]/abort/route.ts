import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getBus } from "@/lib/orchestrator/bus";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const r = (await db.select().from(runs).where(eq(runs.id, id)))[0];
  if (!r) return NextResponse.json({ error: { code: "NOT_FOUND", message: "run not found" } }, { status: 404 });
  await db.update(runs).set({ status: "aborted", completedAt: Date.now() }).where(eq(runs.id, id));
  await getBus().publish({ runId: id, type: "run.aborted", payload: { atStep: r.currentStep }, createdAt: Date.now() });
  return NextResponse.json({ status: "aborted" });
}
