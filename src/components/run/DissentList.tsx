"use client";

export function DissentList({ rows }: { rows: Array<{ seat: string; color?: string; score: number; comment: string }> }) {
  if (!rows.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((d, i) => (
        <li key={i} className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--line)", background: "var(--bg-elev-1)" }}>
          <span className="font-medium" style={{ color: d.color ?? "var(--text)" }}>{d.seat}</span>
          <span className="tnum ml-2" style={{ color: "var(--text-dim)" }}>{d.score}</span>
          <p style={{ color: "var(--text-dim)" }}>{d.comment}</p>
        </li>
      ))}
    </ul>
  );
}
