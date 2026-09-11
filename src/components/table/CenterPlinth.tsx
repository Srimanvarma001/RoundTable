"use client";
import { motion } from "framer-motion";

export function CenterPlinth({ step, ranking }: {
  step: string;
  ranking: Array<{ title: string; score: number; accent: string }>;
}) {
  if (step === "vote" || step === "reveal") {
    return (
      <div className="pointer-events-none absolute left-1/2 top-1/2 w-[46%] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-4"
        style={{ background: "var(--bg-elev-1)", borderColor: "var(--line)" }}>
        <div className="mb-2 text-[11px] uppercase tracking-[0.08em]" style={{ color: "var(--text-mute)" }}>
          {step === "vote" ? "Live ranking" : "Winner"}
        </div>
        <div className="flex flex-col gap-2">
          {ranking.slice(0, 5).map((r) => (
            <motion.div key={r.title} layout transition={{ type: "spring", stiffness: 260, damping: 30 }}>
              <div className="truncate text-[13px]" style={{ color: "var(--text)" }}>{r.title.slice(0, 46)}</div>
              <motion.div layout className="h-1.5 rounded-full" style={{ background: r.accent }}
                animate={{ width: `${(r.score / 10) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 22 }} />
            </motion.div>
          ))}
          {ranking.length === 0 && <div className="text-[13px]" style={{ color: "var(--text-mute)" }}>Votes landing…</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] uppercase tracking-[0.2em]"
      style={{ color: "var(--text-mute)", opacity: 0.6 }}>
      {step}
    </div>
  );
}
