"use client";

const STEPS = ["propose", "debate", "refine", "vote", "reveal"] as const;

export function StepTimeline({ current }: { current: string }) {
  const idx = STEPS.indexOf(current as (typeof STEPS)[number]);
  return (
    <ol className="flex items-center gap-2 overflow-x-auto" aria-label="Steps">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-[12px] uppercase tracking-[0.08em]"
            style={{
              background: i < idx ? "var(--ok)" : i === idx ? "var(--seat-5)" : "var(--bg-elev-2)",
              color: i <= idx ? "var(--on-accent)" : "var(--text-dim)",
            }}>
            {s}
          </span>
          {i < STEPS.length - 1 && <span style={{ color: "var(--text-mute)" }}>→</span>}
        </li>
      ))}
    </ol>
  );
}
