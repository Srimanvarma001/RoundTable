"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RunCompare } from "@/components/history/RunCompare";

function Body() {
  const sp = useSearchParams();
  const a = sp.get("a") ?? "";
  const b = sp.get("b") ?? "";
  const q = useQuery({
    queryKey: ["compare", a, b],
    enabled: !!a && !!b,
    queryFn: async () => (await fetch(`/api/runs/compare?a=${a}&b=${b}`).then((r) => r.json())) as { a: Record<string, unknown>; b: Record<string, unknown> },
  });
  if (!a || !b) return <p className="text-sm">Pass ?a=&lt;runId&gt;&b=&lt;runId&gt;.</p>;
  if (!q.data) return <p className="text-sm">Loading…</p>;
  return <RunCompare a={q.data.a} b={q.data.b} />;
}

export default function ComparePage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
