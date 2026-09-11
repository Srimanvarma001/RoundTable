import { describe, it, expect } from "vitest";
import { normaliseWeights, finalScores, breakTies, collectDissent, distinctness, ZeroTotalWeightError } from "@/lib/agents/weights";

describe("weights normalisation", () => {
  it("defaults sum to 1 with Me at 0.25", () => {
    const seats = [
      { id: "me", weight: 0.25, enabled: true },
      ...Array.from({ length: 7 }, (_, i) => ({ id: `s${i}`, weight: 0.75 / 7, enabled: true })),
    ];
    const m = normaliseWeights(seats);
    const sum = [...m.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
    expect(m.get("me")).toBeCloseTo(0.25);
  });
  it("disabling renormalises", () => {
    const m = normaliseWeights([
      { id: "a", weight: 1, enabled: true },
      { id: "b", weight: 1, enabled: false },
    ]);
    expect(m.get("a")).toBeCloseTo(1);
    expect(m.has("b")).toBe(false);
  });
  it("zero total throws typed error", () => {
    expect(() => normaliseWeights([{ id: "a", weight: 0, enabled: true }])).toThrow(ZeroTotalWeightError);
  });
});

describe("scoring", () => {
  it("matches hand-computed fixture", () => {
    const norm = new Map([["a", 0.25], ["b", 0.75]]);
    const s = finalScores([
      { agentId: "a", proposalId: "p", score: 8 },
      { agentId: "b", proposalId: "p", score: 4 },
    ], norm);
    expect(s.get("p")).toBeCloseTo(8 * 0.25 + 4 * 0.75);
  });
  it("zero-weight seat cannot change outcome", () => {
    const norm = new Map([["a", 1], ["z", 0]]);
    const s = finalScores([
      { agentId: "a", proposalId: "p", score: 5 },
      { agentId: "z", proposalId: "p", score: 10 },
    ], norm);
    expect(s.get("p")).toBeCloseTo(5);
  });
});

describe("tie-break", () => {
  const base = { proposalId: "x", createdAt: 1, finalScore: 7, meScore: 5, meanScore: 5, contrarianScore: 5 };
  it("me score wins first", () => {
    expect(breakTies([base, { ...base, proposalId: "y", meScore: 9 }])).toBe("y");
  });
  it("mean wins second", () => {
    expect(breakTies([base, { ...base, proposalId: "y", meanScore: 9 }])).toBe("y");
  });
  it("contrarian wins third", () => {
    expect(breakTies([base, { ...base, proposalId: "y", contrarianScore: 9 }])).toBe("y");
  });
  it("earlier created wins fourth", () => {
    expect(breakTies([{ ...base, proposalId: "y", createdAt: 0 }])).toBe("y");
  });
  it("fully tied resolves by id", () => {
    expect(breakTies([{ ...base, proposalId: "b" }, { ...base, proposalId: "a" }])).toBe("a");
  });
});

describe("dissent", () => {
  it("boundary at mean-2 counts", () => {
    const out = collectDissent(
      [{ agentId: "a", proposalId: "p", score: 3, isWinner: false }],
      new Map([["p", 5]]),
    );
    expect(out.length).toBe(1);
  });
  it("winner scored exactly 5 is not dissent", () => {
    const out = collectDissent(
      [{ agentId: "a", proposalId: "p", score: 5, isWinner: true }],
      new Map([["p", 6.5]]),
    );
    expect(out.length).toBe(0);
  });
  it("winner below 5 is dissent", () => {
    const out = collectDissent(
      [{ agentId: "a", proposalId: "p", score: 4, isWinner: true }],
      new Map([["p", 8]]),
    );
    expect(out.length).toBe(1);
  });
});

describe("distinctness", () => {
  it("identical texts score 1", () => {
    expect(distinctness(["hello world", "hello world"])).toBeCloseTo(1);
  });
});
