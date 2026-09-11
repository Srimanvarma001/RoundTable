"use client";

export function ScoreBreakdown({ votes }: {
  votes: Array<{ proposalId: string; title: string; seats: Array<{ color: string; value: number }> }>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {votes.map((v) => (
        <div key={v.proposalId}>
          <div className="truncate text-[13px]">{v.title}</div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-elev-3)" }}>
            {v.seats.map((s, i) => (
              <div key={i} style={{ width: `${Math.max(s.value * 100, 2)}%`, background: s.color }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
