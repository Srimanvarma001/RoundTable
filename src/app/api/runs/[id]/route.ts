import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { runs, proposals, critiques, votes, runEvents } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { finalScores } from "@/lib/agents/weights";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const r = (await db.select().from(runs).where(eq(runs.id, id)))[0];
  if (!r) return NextResponse.json({ error: { code: "NOT_FOUND", message: "run not found" } }, { status: 404 });
  const props = await db.select().from(proposals).where(eq(proposals.runId, id));
  const crits = await db.select().from(critiques).where(eq(critiques.runId, id));
  const vts = await db.select().from(votes).where(eq(votes.runId, id));
  const evts = await db.select().from(runEvents).where(eq(runEvents.runId, id)).orderBy(asc(runEvents.seq));
  const reveal = [...evts].reverse().find((e) => e.type === "run.completed");
  const norm = new Map<string, number>();
  for (const v of vts) norm.set(v.agentId, v.weightAtVote);
  const scores = finalScores(vts.map((v) => ({ agentId: v.agentId, proposalId: v.proposalId, score: v.score })), norm);
  return NextResponse.json({
    id: r.id, status: r.status, currentStep: r.currentStep, seedPrompt: r.seedPrompt,
    proposals: props, critiques: crits, votes: vts,
    scores: Object.fromEntries(scores),
    reveal: reveal ? JSON.parse(reveal.payload) : null,
    tokensIn: r.tokensIn, tokensOut: r.tokensOut, costUsd: r.costEstimateUsd, llmCalls: r.llmCalls,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  await db.delete(votes).where(eq(votes.runId, id));
  await db.delete(critiques).where(eq(critiques.runId, id));
  await db.delete(proposals).where(eq(proposals.runId, id));
  await db.delete(runEvents).where(eq(runEvents.runId, id));
  await db.delete(runs).where(eq(runs.id, id));
  return new NextResponse(null, { status: 204 });
}
