import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { runs, runEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const a = url.searchParams.get("a");
  const b = url.searchParams.get("b");
  if (!a || !b) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "need ?a=&b=" } }, { status: 400 });
  const db = getDb();
  const ra = (await db.select().from(runs).where(eq(runs.id, a)))[0];
  const rb = (await db.select().from(runs).where(eq(runs.id, b)))[0];
  if (!ra || !rb) return NextResponse.json({ error: { code: "NOT_FOUND", message: "run not found" } }, { status: 404 });
  const ea = await db.select().from(runEvents).where(eq(runEvents.runId, a));
  const eb = await db.select().from(runEvents).where(eq(runEvents.runId, b));
  const wa = [...ea].reverse().find((e) => e.type === "run.completed");
  const wb = [...eb].reverse().find((e) => e.type === "run.completed");
  const pa = wa ? (JSON.parse(wa.payload) as { winner: { title: string }; metrics: Record<string, number> }) : null;
  const pb = wb ? (JSON.parse(wb.payload) as { winner: { title: string }; metrics: Record<string, number> }) : null;
  const snapA = JSON.parse(ra.agentSnapshot || "[]");
  const snapB = JSON.parse(rb.agentSnapshot || "[]");
  const changed = (snapA as Array<{ seatKey: string; modelId: string; weight: number }>).filter((s) => {
    const o = (snapB as Array<{ seatKey: string; modelId: string; weight: number }>).find((x) => x.seatKey === s.seatKey);
    return !o || o.modelId !== s.modelId || o.weight !== s.weight;
  }).map((s) => s.seatKey);
  return NextResponse.json({
    a: { seedPrompt: ra.seedPrompt, winner: pa?.winner.title ?? "", metrics: pa?.metrics ?? {}, cost: ra.costEstimateUsd },
    b: { seedPrompt: rb.seedPrompt, winner: pb?.winner.title ?? "", metrics: pb?.metrics ?? {}, cost: rb.costEstimateUsd },
    deltas: {
      metrics: Object.fromEntries(
        Object.keys({ ...(pa?.metrics ?? {}), ...(pb?.metrics ?? {}) }).map((k) => [
          k, Number((pb?.metrics as Record<string, number>)?.[k] ?? 0) - Number((pa?.metrics as Record<string, number>)?.[k] ?? 0),
        ]),
      ),
      seatsChanged: changed,
    },
  });
}
