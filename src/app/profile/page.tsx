"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProfileItemTable, ProfileIngestPanel, ProfileSummaryPreview } from "@/components/profile/ProfilePanels";

export default function ProfilePage() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: async () => await fetch("/api/profile").then((r) => r.json()) as {
      profile: { id: string; summaryText: string; authorBrief: string } | null;
      items: Array<{ id: string; kind: string; label: string; detail: string; source: string; confidence: number; locked: boolean }>;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["profile"] });
  async function ingest(source: string) {
    setBusy(true);
    try {
      if (source === "all") await fetch("/api/profile/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sources: ["github", "notes"] }) });
      else await fetch("/api/profile/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) });
      refresh();
    } finally { setBusy(false); }
  }
  const m = useMutation({
    mutationFn: async (v: { id?: string; method: string; body?: unknown }) =>
      fetch(v.id ? `/api/profile/items/${v.id}` : "/api/profile/items", {
        method: v.method, headers: { "Content-Type": "application/json" }, body: v.body ? JSON.stringify(v.body) : undefined,
      }),
    onSuccess: refresh,
  });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Me Agent profile</h1>
      <ProfileIngestPanel onIngest={ingest} busy={busy} />
      {q.data && <ProfileItemTable items={q.data.items}
        onEdit={(id, patch) => m.mutate({ id, method: "PUT", body: patch })}
        onToggleLock={(id) => {
          const it = q.data.items.find((x) => x.id === id);
          m.mutate({ id, method: "PUT", body: { locked: !it?.locked } });
        }}
        onDelete={(id) => m.mutate({ id, method: "DELETE" })} />}
      {q.data?.profile && <ProfileSummaryPreview summary={q.data.profile.summaryText} brief={q.data.profile.authorBrief} />}
    </div>
  );
}
