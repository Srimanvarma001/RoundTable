"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { RevealCard } from "@/components/run/RevealCard";
import { ScoreBreakdown } from "@/components/run/ScoreBreakdown";

export default function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({
    queryKey: ["run", id],
    queryFn: async () => await fetch(`/api/runs/${id}`).then((r) => r.json()),
  });
  const snap = q.data as
    | { proposals: unknown[]; votes: unknown[]; reveal?: never }
    | undefined;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Replay (token-free)</h1>
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        Reconstructed from stored rows — zero LLM calls. <a className="underline" href={`/api/runs/${id}/export?format=md`}>Export MD</a>
        {" · "}<a className="underline" href={`/api/runs/${id}/export?format=json`}>JSON</a>
      </p>
      <RevealCard reveal={(snap?.reveal ?? null) as never} />
      <ScoreBreakdown votes={[]} />
    </div>
  );
}
