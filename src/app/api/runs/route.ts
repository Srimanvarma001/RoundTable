import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { runs } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { createRun } from "@/lib/orchestrator/engine";

const Body = z.object({
  seedPrompt: z.string().min(1).max(2000),
  seedMode: z.enum(["vague", "specific"]).optional(),
  refineEnabled: z.boolean().optional(),
  budgetUsd: z.number().positive().optional(),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const runId = await createRun(body);
  return NextResponse.json({ runId, status: "created" }, { status: 201 });
}

export async function GET(req: Request) {
  const db = getDb();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const rows = await db.select().from(runs).orderBy(desc(runs.createdAt)).limit(limit);
  return NextResponse.json({
    runs: rows.map((r) => ({
      id: r.id, seedPrompt: r.seedPrompt, status: r.status, createdAt: r.createdAt,
      cost: r.costEstimateUsd,
    })),
  });
}
