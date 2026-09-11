"use client";
import { useQuery } from "@tanstack/react-query";
import { RunHistoryList } from "@/components/history/RunHistoryList";

export default function RunsPage() {
  const q = useQuery({
    queryKey: ["runs"],
    queryFn: async () => (await fetch("/api/runs").then((r) => r.json())) as { runs: never[] },
  });
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Run history</h1>
      <RunHistoryList runs={(q.data?.runs ?? []) as never} />
    </div>
  );
}
