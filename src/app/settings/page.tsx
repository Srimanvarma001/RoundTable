"use client";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async () => await fetch("/api/settings").then((r) => r.json()) as {
      settings: Record<string, unknown>; providers: Record<string, boolean>;
    },
  });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="flex items-center gap-2 text-sm">
        Theme:
        {(["warroom", "hearth"] as const).map((t) => (
          <button key={t} onClick={() => setTheme(t)} className="rounded-xl border px-3 py-1"
            style={{ borderColor: theme === t ? "var(--seat-5)" : "var(--line)" }}>{t}</button>
        ))}
      </div>
      <div className="text-sm" style={{ color: "var(--text-dim)" }}>
        Provider keys (presence only, never values):{" "}
        {q.data ? Object.entries(q.data.providers).map(([k, v]) => `${k}: ${v ? "set" : "missing"}`).join(" · ") : "…"}
      </div>
      <pre className="whitespace-pre-wrap rounded-xl border p-3 text-xs" style={{ borderColor: "var(--line)" }}>
        {JSON.stringify(q.data?.settings ?? {}, null, 2)}
      </pre>
    </div>
  );
}
