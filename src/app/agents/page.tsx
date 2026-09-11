"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SeatGrid, WeightPreview } from "@/components/agents/SeatForm";

export default function AgentsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["agents"],
    queryFn: async () => await fetch("/api/agents").then((r) => r.json()) as {
      agents: Array<{ id: string; name: string; weight: number; enabled: boolean } & Record<string, unknown>>;
      normalisedWeights: Record<string, number>;
    },
  });
  const mut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      await fetch(`/api/agents/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Seats (all eight editable)</h1>
      {q.data && <WeightPreview agents={q.data.agents.map((a) => ({ id: a.id, name: a.name, weight: Number(a.weight), enabled: Boolean(a.enabled) }))} />}
      {q.data && <SeatGrid agents={q.data.agents} onSave={(id, p) => mut.mutate({ id, patch: p })} />}
    </div>
  );
}
