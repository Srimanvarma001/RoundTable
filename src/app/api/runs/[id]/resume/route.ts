import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runLoop } from "@/lib/orchestrator/engine";
import { getBus } from "@/lib/orchestrator/bus";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const r = (await db.select().from(runs).where(eq(runs.id, id)))[0];
  if (!r) return NextResponse.json({ error: { code: "NOT_FOUND", message: "run not found" } }, { status: 404 });
  await db.update(runs).set({ pauseRequested: 0, status: "running" }).where(eq(runs.id, id));
  await getBus().publish({ runId: id, type: "run.resumed", payload: { step: r.currentStep }, createdAt: Date.now() });
  void runLoop(id).catch(() => {});
  return NextResponse.json({ status: "running" }, { status: 202 });
}
