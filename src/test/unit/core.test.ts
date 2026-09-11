import { describe, it, expect } from "vitest";
import { extractJson, ProposeSchema } from "@/lib/llm/json";
import { StructuredOutputError } from "@/lib/llm/types";
import { BudgetGuard } from "@/lib/orchestrator/budget";
import { BudgetExceededError } from "@/lib/llm/types";
import { taskKey } from "@/lib/orchestrator/taskKey";
import { mergeItems } from "@/lib/profile/merge";
import { renderSummaries } from "@/lib/profile/summary";
import { digestProposals } from "@/lib/orchestrator/digest";

describe("json extraction", () => {
  it("clean json", () => {
    const v = extractJson('{"proposals":[{"title":"T","description":"D","rationale":"R"}]}', ProposeSchema);
    expect(v.proposals.length).toBe(1);
  });
  it("json in prose + fences", () => {
    const v = extractJson('Here you go:\n```json\n{"proposals":[{"title":"T","description":"D","rationale":"R"}]}\n```\nDone.', ProposeSchema);
    expect(v.proposals[0].title).toBe("T");
  });
  it("garbage throws StructuredOutputError", () => {
    expect(() => extractJson("nope", ProposeSchema)).toThrow(StructuredOutputError);
  });
});

describe("budget", () => {
  it("warns at 80% and aborts at limit before dispatch", () => {
    let warned = 0;
    const g = new BudgetGuard({ usedUsd: 0.8, limitUsd: 1, tokensUsed: 0, tokenLimit: 1e6, callsUsed: 0, callLimit: 99 }, () => warned++);
    g.checkBeforeDispatch();
    expect(warned).toBe(1);
    const g2 = new BudgetGuard({ usedUsd: 1, limitUsd: 1, tokensUsed: 0, tokenLimit: 1e6, callsUsed: 0, callLimit: 99 });
    expect(() => g2.checkBeforeDispatch()).toThrow(BudgetExceededError);
  });
});

describe("taskKey", () => {
  it("attempt-agnostic format", () => {
    expect(taskKey("r", "propose", "a", 1)).toContain("attempt-agnostic");
  });
});

describe("merge", () => {
  it("locked survives", () => {
    const { merged } = mergeItems(
      [{ id: "1", kind: "skill", label: "TS", detail: "old", source: "manual", confidence: 1, locked: true, orderIndex: 0 }],
      [{ kind: "skill", label: "TS", detail: "new", source: "github", confidence: 0.9 }],
    );
    expect(merged.find((m) => m.id === "1")?.detail).toBe("old");
  });
});

describe("summary", () => {
  it("deterministic + brief cap", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: `${i}`, kind: "skill", label: `S${i}`, detail: "word ".repeat(50),
      source: "github", confidence: 0.9, locked: false, orderIndex: i,
    }));
    const a = renderSummaries(items);
    const b = renderSummaries(items);
    expect(a.summaryText).toBe(b.summaryText);
    expect(a.authorBrief.split(/\s+/).length).toBeLessThanOrEqual(400);
  });
});

describe("digest", () => {
  it("truncates", () => {
    const d = digestProposals([{ title: "T", description: "x".repeat(9000) }], 100);
    expect(d.length).toBeLessThanOrEqual(200);
  });
});
