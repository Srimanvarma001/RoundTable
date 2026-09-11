export class ZeroTotalWeightError extends Error {
  constructor() {
    super("Total weight is zero; enable at least one seat");
    this.name = "ZeroTotalWeightError";
  }
}

export interface WeightedSeat {
  id: string;
  weight: number;
  enabled: boolean;
}

/** Normalise raw weights over enabled seats. Throws ZeroTotalWeightError on zero total. */
export function normaliseWeights<T extends WeightedSeat>(seats: T[]): Map<string, number> {
  const enabled = seats.filter((s) => s.enabled);
  const total = enabled.reduce((a, s) => a + s.weight, 0);
  if (total <= 0) throw new ZeroTotalWeightError();
  const out = new Map<string, number>();
  for (const s of enabled) out.set(s.id, s.weight / total);
  return out;
}

export interface ScoredVote {
  agentId: string;
  proposalId: string;
  score: number;
}

/** final_score(proposal) = Σ score × normalisedWeight. Recomputed from rows, never cached. */
export function finalScores(
  votes: ScoredVote[],
  norm: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const v of votes) {
    const w = norm.get(v.agentId) ?? 0;
    out.set(v.proposalId, (out.get(v.proposalId) ?? 0) + v.score * w);
  }
  return out;
}

export interface TieBreakInput {
  proposalId: string;
  createdAt: number;
  finalScore: number;
  meScore: number;
  meanScore: number;
  contrarianScore: number;
}

/** Strictly ordered tie-break, total via proposal id fallback. */
export function breakTies(rows: TieBreakInput[]): string {
  if (rows.length === 0) throw new Error("breakTies: empty input");
  const sorted = [...rows].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.meScore !== a.meScore) return b.meScore - a.meScore;
    if (b.meanScore !== a.meanScore) return b.meanScore - a.meanScore;
    if (b.contrarianScore !== a.contrarianScore)
      return b.contrarianScore - a.contrarianScore;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.proposalId < b.proposalId ? -1 : a.proposalId > b.proposalId ? 1 : 0;
  });
  return sorted[0].proposalId;
}

export interface DissentInput {
  agentId: string;
  proposalId: string;
  score: number;
  isWinner: boolean;
}

/** Dissenter when score <= mean-2 for that proposal, or scored winner < 5. */
export function collectDissent(
  votes: DissentInput[],
  meanByProposal: Map<string, number>,
): DissentInput[] {
  return votes.filter((v) => {
    const mean = meanByProposal.get(v.proposalId) ?? v.score;
    if (v.score <= mean - 2) return true;
    if (v.isWinner && v.score < 5) return true;
    return false;
  });
}

/** Mean pairwise Jaccard similarity over title+description token sets (distinctness). */
export function distinctness(texts: string[]): number {
  if (texts.length < 2) return 1;
  const sets = texts.map(
    (t) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)),
  );
  let sum = 0;
  let n = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i];
      const b = sets[j];
      const inter = [...a].filter((x) => b.has(x)).length;
      const union = new Set([...a, ...b]).size || 1;
      sum += inter / union;
      n++;
    }
  }
  return n ? sum / n : 1;
}
