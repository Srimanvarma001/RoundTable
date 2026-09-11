import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runLoop } from "@/lib/orchestrator/engine";
import { getBus } from "@/lib/orchestrator/bus";

async function setStatus(id: string, patch: Partial<typeof runs.$inferInsert>) {
  const db = getDb();
  await db.update(runs).set(patch).where(eq(runs.id, id));
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const r = (await db.select().from(runs).where(eq(runs.id, id)))[0];
  if (!r) return NextResponse.json({ error: { code: "NOT_FOUND", message: "run not found" } }, { status: 404 });
  if (r.status === "running") return NextResponse.json({ status: "running" }, { status: 202 });
  await setStatus(id, { status: "running", pauseRequested: 0 });
  // fire-and-forget; SSE carries progress
  void runLoop(id).catch(() => {});
  return NextResponse.json({ status: "running" }, { status: 202 });
}

// pause
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  void req;
  void ctx;
  return NextResponse.json({ error: { code: "USE_SUBROUTE", message: "use /pause /resume /abort" } }, { status: 400 });
}

export async function GET(req: Request) {
  void req;
  void getBus;
  return NextResponse.json({ error: { code: "USE_SNAPSHOT", message: "use GET /api/runs/:id" } }, { status: 400 });
}
