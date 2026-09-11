"use client";

export function ProfileItemTable({ items, onEdit, onToggleLock, onDelete }: {
  items: Array<{ id: string; kind: string; label: string; detail: string; source: string; confidence: number; locked: boolean }>;
  onEdit: (id: string, patch: Record<string, unknown>) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const kinds = [...new Set(items.map((i) => i.kind))].sort();
  return (
    <div className="flex flex-col gap-4">
      {kinds.map((k) => (
        <section key={k}>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-mute)" }}>{k}</h3>
          <ul className="flex flex-col gap-2">
            {items.filter((i) => i.kind === k).map((i) => (
              <li key={i.id} className="rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "var(--bg-elev-1)" }}>
                <div className="flex items-center gap-2">
                  <input className="flex-1 bg-transparent font-medium" defaultValue={i.label}
                    onBlur={(e) => onEdit(i.id, { label: e.target.value })} aria-label="label" />
                  <span className="rounded-full border px-2 py-0.5 text-[11px]"
                    style={{ borderColor: "var(--line)", color: i.source === "inferred" ? "var(--warn)" : "var(--text-dim)" }}>
                    {i.source}{i.source === "inferred" ? " · guess" : ""}
                  </span>
                  <button onClick={() => onToggleLock(i.id)} className="text-xs" aria-label="lock">
                    {i.locked ? "🔒" : "🔓"}
                  </button>
                  <button onClick={() => onDelete(i.id)} className="text-xs" aria-label="delete">✕</button>
                </div>
                <textarea className="mt-1 w-full bg-transparent text-sm" rows={2} defaultValue={i.detail}
                  onBlur={(e) => onEdit(i.id, { detail: e.target.value })} aria-label="detail" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ProfileIngestPanel({ onIngest, busy }: { onIngest: (source: string) => void; busy: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {["github", "cv", "local", "notes", "all"].map((s) => (
        <button key={s} disabled={busy} onClick={() => onIngest(s)}
          className="rounded-xl border px-3 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
          {busy ? "…" : `Ingest ${s}`}
        </button>
      ))}
    </div>
  );
}

export function ProfileSummaryPreview({ summary, brief }: { summary: string; brief: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <pre className="whitespace-pre-wrap rounded-xl border p-3 text-xs" style={{ borderColor: "var(--line)" }}>{summary || "(empty)"}</pre>
      <pre className="whitespace-pre-wrap rounded-xl border p-3 text-xs" style={{ borderColor: "var(--line)" }}>{brief || "(empty)"}</pre>
    </div>
  );
}
