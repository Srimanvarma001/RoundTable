"use client";

export function RevealCard({ reveal }: { reveal: {
  winner?: { title: string; description: string; why_it_won?: string; first_steps?: string[]; risks?: string[] };
  metrics?: Record<string, number | boolean>;
  dissent?: Array<{ agentId?: string; seat?: string; score: number; comment: string }>;
} | null }) {
  if (!reveal?.winner) return null;
  const w = reveal.winner;
  return (
    <section className="rounded-2xl border p-6" style={{ borderColor: "var(--line)", background: "var(--bg-elev-1)" }} aria-live="polite">
      <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: "var(--text-mute)" }}>Winner</div>
      <h2 className="tnum text-2xl font-semibold" style={{ color: "var(--text)" }}>{w.title}</h2>
      <p className="mt-2 text-[15px]" style={{ color: "var(--text-dim)" }}>{w.description}</p>
      {w.why_it_won && <p className="mt-2 text-sm" style={{ color: "var(--text)" }}>Why it won: {w.why_it_won}</p>}
      {!!w.first_steps?.length && (
        <>
          <h3 className="mt-4 font-medium">First steps</h3>
          <ul className="list-disc pl-5 text-sm">{w.first_steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </>
      )}
      {!!reveal.dissent?.length && (
        <>
          <h3 className="mt-4 font-medium">Dissent ({reveal.dissent.length})</h3>
          <ul className="mt-1 flex flex-col gap-1">
            {reveal.dissent.map((d, i) => (
              <li key={i} className="text-sm" style={{ color: "var(--text-dim)" }}>
                <span className="tnum font-semibold">{d.score}</span> — {d.comment}
              </li>
            ))}
          </ul>
        </>
      )}
      {!!reveal.metrics && (
        <dl className="tnum mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          {Object.entries(reveal.metrics).map(([k, v]) => (
            <div key={k}><dt className="text-xs" style={{ color: "var(--text-mute)" }}>{k}</dt><dd>{String(v)}</dd></div>
          ))}
        </dl>
      )}
    </section>
  );
}
