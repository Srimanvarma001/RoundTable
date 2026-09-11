"use client";
import Link from "next/link";

export function RunHistoryList({ runs }: {
  runs: Array<{ id: string; seedPrompt: string; status: string; createdAt: number; winner?: string; cost?: number }>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {runs.map((r) => (
        <li key={r.id} className="rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "var(--bg-elev-1)" }}>
          <Link href={`/runs/${r.id}`} className="font-medium" style={{ color: "var(--text)" }}>
            {(r.seedPrompt ?? "").slice(0, 80)}
          </Link>
          <div className="tnum text-xs" style={{ color: "var(--text-mute)" }}>
            {r.status} · {new Date(r.createdAt).toLocaleString()} {r.winner ? `· ${r.winner}` : ""} {r.cost !== undefined ? `· $${r.cost.toFixed(3)}` : ""}
          </div>
        </li>
      ))}
      {runs.length === 0 && <li className="text-sm" style={{ color: "var(--text-mute)" }}>No runs yet. Start one from /run.</li>}
    </ul>
  );
}
