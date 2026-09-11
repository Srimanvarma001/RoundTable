/** Compress prior artefacts for later steps. Deterministic, token-budget aware. */
export function digestProposals(
  proposals: Array<{ title: string; description: string }>,
  maxChars = 4000,
): string {
  const lines = proposals.map((p, i) => `${i + 1}. ${p.title} — ${p.description}`);
  let out = lines.join("\n");
  if (out.length > maxChars) out = out.slice(0, maxChars) + "\n…(truncated)";
  return out;
}

export function digestCritiques(
  critiques: Array<{ targetTitle: string; stance: string; comment: string }>,
  maxChars = 3000,
): string {
  const lines = critiques.map((c) => `- [${c.stance}] ${c.targetTitle}: ${c.comment}`);
  let out = lines.join("\n");
  if (out.length > maxChars) out = out.slice(0, maxChars) + "\n…(truncated)";
  return out;
}

/** Winner-per-step always retained: first proposal kept verbatim even under truncation. */
export function digestWithPin(
  items: string[],
  pinIndex: number,
  maxChars: number,
): string {
  if (items.length === 0) return "";
  const pinned = items[pinIndex] ?? items[0];
  const rest = items.filter((_, i) => i !== pinIndex);
  let out = pinned;
  for (const r of rest) {
    if ((out + "\n" + r).length > maxChars) break;
    out += "\n" + r;
  }
  return out;
}
