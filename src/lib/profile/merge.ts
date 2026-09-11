export interface ProfileItemRow {
  id: string;
  kind: string;
  label: string;
  detail: string;
  source: string;
  confidence: number;
  locked: boolean;
  orderIndex: number;
}

/** Merge: locked/manual survive; generated matched by kind+normalised label; removed hidden. */
export function mergeItems(
  existing: ProfileItemRow[],
  fresh: Array<{ kind: string; label: string; detail: string; source: string; confidence: number }>,
): { merged: ProfileItemRow[]; added: number; changed: number; removed: number } {
  const norm = (s: string) => s.trim().toLowerCase();
  const locked = existing.filter((e) => e.locked || e.source === "manual");
  const gen = existing.filter((e) => !(e.locked || e.source === "manual"));
  const genByKey = new Map(gen.map((g) => [`${g.kind}:${norm(g.label)}`, g]));
  const merged: ProfileItemRow[] = [...locked];
  let added = 0;
  let changed = 0;
  const seen = new Set<string>();
  for (const f of fresh) {
    const key = `${f.kind}:${norm(f.label)}`;
    seen.add(key);
    const prev = genByKey.get(key);
    if (prev) {
      const dirty = prev.detail !== f.detail || prev.confidence !== f.confidence;
      if (dirty) changed++;
      merged.push({ ...prev, detail: f.detail, confidence: f.confidence, source: f.source });
    } else {
      added++;
      merged.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind: f.kind, label: f.label, detail: f.detail, source: f.source,
        confidence: f.confidence, locked: false, orderIndex: merged.length,
      });
    }
  }
  const removed = gen.filter((g) => !seen.has(`${g.kind}:${norm(g.label)}`)).length;
  return { merged, added, changed, removed };
}
