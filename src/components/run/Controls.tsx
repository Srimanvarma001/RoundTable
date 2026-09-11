"use client";

export function Controls({ status, onGenerate, onStop, onResume, onAbort, onSkip }: {
  status: string;
  onGenerate: () => void; onStop: () => void; onResume: () => void; onAbort: () => void; onSkip: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "idle" && <button onClick={onGenerate} className="rounded-xl px-4 py-2 font-medium" style={{ background: "var(--seat-5)", color: "var(--on-accent)" }}>Generate</button>}
      {status === "running" && <button onClick={onStop} className="rounded-xl px-4 py-2" style={{ background: "var(--warn)", color: "var(--on-accent)" }}>Stop (pause)</button>}
      {status === "paused" && (
        <>
          <button onClick={onResume} className="rounded-xl px-4 py-2" style={{ background: "var(--ok)", color: "var(--on-accent)" }}>Resume</button>
          <button onClick={onAbort} className="rounded-xl px-4 py-2" style={{ background: "var(--danger)", color: "var(--on-accent)" }}>Abort</button>
        </>
      )}
      <button onClick={onSkip} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>Skip animation</button>
    </div>
  );
}
