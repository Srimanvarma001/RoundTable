import type { ProfileItemRow } from "./merge";

/** Deterministic summary rendering, no LLM. Same profile → same text. */
export function renderSummaries(items: ProfileItemRow[]): { summaryText: string; authorBrief: string } {
  const byKind = new Map<string, ProfileItemRow[]>();
  for (const i of items) {
    if (!byKind.has(i.kind)) byKind.set(i.kind, []);
    byKind.get(i.kind)!.push(i);
  }
  for (const arr of byKind.values()) arr.sort((a: ProfileItemRow, b: ProfileItemRow) => a.orderIndex - b.orderIndex);
  const kinds = [...byKind.keys()].sort();
  const summaryText = kinds
    .map((k) => `## ${k}\n` + byKind.get(k)!.map((i) => `- **${i.label}** (${i.source}, ${Math.round(i.confidence * 100)}%): ${i.detail}`).join("\n"))
    .join("\n\n");
  const briefKinds = ["skill", "constraint", "anti_pattern", "goal"];
  let brief = briefKinds
    .flatMap((k) => byKind.get(k) ?? [])
    .map((i) => `- ${i.label}: ${i.detail.split(".")[0]}.`)
    .join("\n");
  // hard-cap author_brief at 400 words
  const words = brief.split(/\s+/);
  if (words.length > 400) brief = words.slice(0, 400).join(" ");
  return { summaryText, authorBrief: brief };
}
