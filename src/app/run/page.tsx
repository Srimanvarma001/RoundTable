"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoundTable } from "@/components/table/RoundTable";
import { SeatStack } from "@/components/table/SeatStack";
import { Controls } from "@/components/run/Controls";
import { StepTimeline } from "@/components/run/StepTimeline";
import { RevealCard } from "@/components/run/RevealCard";
import { ReasoningDrawer } from "@/components/run/ReasoningDrawer";
import { useRunStream } from "@/hooks/useRunStream";
import { useTheme } from "@/hooks/useTheme";
import type { AgentDTO } from "@/shared/types";

export default function RunPage() {
  useTheme();
  const [seed, setSeed] = useState("A developer-tools side project I will actually finish");
  const [runId, setRunId] = useState<string | null>(null);
  const [cadence, setCadence] = useState(45);
  const [openSeat, setOpenSeat] = useState<string | null>(null);
  const { state, flush } = useRunStream(runId, cadence);

  const agentsQ = useQuery({
    queryKey: ["agents"],
    queryFn: async () => (await fetch("/api/agents").then((r) => r.json())) as { agents: AgentDTO[]; normalisedWeights: Record<string, number> },
  });
  const agents = agentsQ.data?.agents ?? [];
  const weights = agentsQ.data?.normalisedWeights ?? {};

  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setCompact(mq.matches);
    const h = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  async function generate() {
    const r = await fetch("/api/runs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedPrompt: seed }),
    });
    const j = await r.json();
    setRunId(j.runId);
    await fetch(`/api/runs/${j.runId}/start`, { method: "POST" });
  }

  const ranking = Object.entries(state.partialScores).map(([id, score]) => {
    const p = (state.reveal as { winner?: { title: string } } | null);
    void p;
    return { title: id, score, accent: "var(--seat-5)" };
  });

  const openAgent = agents.find((a) => a.id === openSeat) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="sr-only">{`Step ${state.step}. ${state.controls}`}</div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={seed} onChange={(e) => setSeed(e.target.value)} aria-label="Seed prompt"
          className="min-w-[280px] flex-1 rounded-xl border p-2" style={{ borderColor: "var(--line)", background: "var(--bg-elev-1)" }} />
        <Controls status={state.controls === "idle" && !runId ? "idle" : state.controls}
          onGenerate={generate}
          onStop={() => runId && fetch(`/api/runs/${runId}/pause`, { method: "POST" })}
          onResume={() => runId && fetch(`/api/runs/${runId}/resume`, { method: "POST" })}
          onAbort={() => runId && fetch(`/api/runs/${runId}/abort`, { method: "POST" })}
          onSkip={() => { setCadence(0); flush(); }} />
      </div>
      <StepTimeline current={state.step} />
      {compact ? (
        <SeatStack agents={agents} seats={Object.fromEntries(Object.entries(state.seats).map(([k, v]) => [k, { status: v.status, take: v.take }]))} />
      ) : (
        <RoundTable agents={agents} step={state.step as never} weights={weights} ranking={ranking}
          seats={Object.fromEntries(Object.entries(state.seats).map(([k, v]) => [k, { status: v.status, take: v.take }]))}
          onOpenSeat={setOpenSeat} openSeatId={openSeat} />
      )}
      <RevealCard reveal={state.reveal as never} />
      <ReasoningDrawer agent={openAgent} reasoning={openSeat ? state.seats[openSeat]?.reasoning ?? "" : ""}
        answer={openSeat ? state.seats[openSeat]?.take ?? "" : ""}
        onClose={() => setOpenSeat(null)} agents={agents} onSwitch={setOpenSeat} />
    </div>
  );
}
