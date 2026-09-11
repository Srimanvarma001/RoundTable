import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { runs, proposals, critiques, votes, runEvents, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { toMarkdown, toJSON } from "@/lib/export/markdown";
import { finalScores } from "@/lib/agents/weights";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") ?? "md";
  const db = getDb();
  const r = (await db.select().from(runs).where(eq(runs.id, id)))[0];
  if (!r) return NextResponse.json({ error: { code: "NOT_FOUND", message: "run not found" } }, { status: 404 });
  const props = await db.select().from(proposals).where(eq(proposals.runId, id));
  const crits = await db.select().from(critiques).where(eq(critiques.runId, id));
  const vts = await db.select().from(votes).where(eq(votes.runId, id));
  const seats = await db.select().from(agents);
  const seatName = new Map(seats.map((s) => [s.id, s.name]));
  const norm = new Map(vts.map((v) => [v.agentId, v.weightAtVote] as [string, number]));
  const scores = finalScores(vts.map((v) => ({ agentId: v.agentId, proposalId: v.proposalId, score: v.score })), norm);
  const evts = await db.select().from(runEvents).where(eq(runEvents.runId, id));
  const completed = [...evts].reverse().find((e) => e.type === "run.completed");
  const payload = completed ? (JSON.parse(completed.payload) as { winner: { title: string; description: string; why_it_won: string }; metrics: Record<string, number | boolean>; dissent: Array<{ agentId: string; score: number; comment: string }> }) : null;
  const doc = {
    seedPrompt: r.seedPrompt,
    proposals: props.map((p) => ({
      title: p.title, author: seatName.get(p.agentId) ?? p.agentId,
      score: scores.get(p.id) ?? 0, description: p.description,
    })),
    critiques: crits.map((c) => ({
      author: seatName.get(c.agentId) ?? c.agentId, target: c.targetProposalId, stance: c.stance, comment: c.comment,
    })),
    votes: vts.map((v) => ({
      agent: seatName.get(v.agentId) ?? v.agentId, proposal: v.proposalId,
      score: v.score, weight: v.weightAtVote, comment: v.comment,
    })),
    winner: {
      title: payload?.winner.title ?? "", description: payload?.winner.description ?? "",
      why: payload?.winner.why_it_won ?? "",
    },
    dissent: (payload?.dissent ?? []).map((d) => ({
      seat: seatName.get(d.agentId) ?? d.agentId, score: d.score, comment: d.comment,
    })),
    metrics: (payload?.metrics ?? {}) as Record<string, number | boolean>,
  };
  if (format === "json") {
    return new Response(toJSON(doc), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="run-${id}.json"` },
    });
  }
  return new Response(toMarkdown(doc), {
    headers: { "Content-Type": "text/markdown", "Content-Disposition": `attachment; filename="run-${id}.md"` },
  });
}
