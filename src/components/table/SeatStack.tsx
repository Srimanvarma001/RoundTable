"use client";
import type { AgentDTO } from "@/shared/types";

export function SeatStack({ agents, seats }: {
  agents: AgentDTO[];
  seats: Record<string, { status: string; take: string }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {agents.map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-xl border p-3"
          style={{ borderColor: "var(--line)", background: "var(--bg-elev-1)" }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: `${a.accentColor}22`, color: a.accentColor }}>
            {a.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-sm" style={{ color: "var(--text)" }}>{a.name}</span>
          <span className="tnum ml-auto text-xs" style={{ color: "var(--text-dim)" }}>
            {seats[a.id]?.status ?? "idle"}
          </span>
        </div>
      ))}
    </div>
  );
}
