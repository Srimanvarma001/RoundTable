"use client";
import { useState } from "react";

export function WeightPreview({ agents }: { agents: Array<{ id: string; name: string; weight: number; enabled: boolean }> }) {
  const total = agents.filter((a) => a.enabled).reduce((s, a) => s + a.weight, 0) || 1;
  return (
    <div className="flex flex-col gap-1">
      {agents.map((a) => {
        const pct = a.enabled ? a.weight / total : 0;
        return (
          <div key={a.id} className="flex items-center gap-2 text-sm">
            <span className="w-40 truncate">{a.name}</span>
            <div className="h-2 flex-1 rounded-full" style={{ background: "var(--bg-elev-3)" }}>
              <div className="h-2 rounded-full" style={{ width: `${pct * 100}%`, background: "var(--seat-5)" }} />
            </div>
            <span className="tnum w-14 text-right">{Math.round(pct * 100)}%</span>
            {pct > 0.5 && <span style={{ color: "var(--warn)" }}>⚠ over 50%</span>}
          </div>
        );
      })}
    </div>
  );
}

export function SeatForm({ agent, onSave }: { agent: Record<string, unknown>; onSave: (p: Record<string, unknown>) => void }) {
  const [form, setForm] = useState(agent);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="flex flex-col gap-2 rounded-xl border p-4"
      style={{ borderColor: "var(--line)", background: "var(--bg-elev-1)" }}>
      <label className="text-sm">Name
        <input className="mt-1 w-full rounded-lg border p-2" style={{ borderColor: "var(--line)" }}
          value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="text-sm">Lens prompt
        <textarea className="mt-1 w-full rounded-lg border p-2" rows={4} style={{ borderColor: "var(--line)" }}
          value={String(form.lensPrompt ?? form.lens_prompt ?? "")}
          onChange={(e) => setForm({ ...form, lensPrompt: e.target.value, lens_prompt: e.target.value })} />
      </label>
      <div className="flex gap-2">
        <label className="text-sm">Model
          <input className="mt-1 w-full rounded-lg border p-2" style={{ borderColor: "var(--line)" }}
            value={String(form.modelId ?? form.model_id ?? "")}
            onChange={(e) => setForm({ ...form, modelId: e.target.value })} />
        </label>
        <label className="text-sm">Weight
          <input type="number" step="0.01" min="0" max="1" className="mt-1 w-full rounded-lg border p-2"
            style={{ borderColor: "var(--line)" }}
            value={Number(form.weight ?? 0.1)}
            onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
        </label>
        <label className="text-sm">Temp
          <input type="number" step="0.05" min="0" max="2" className="mt-1 w-full rounded-lg border p-2"
            style={{ borderColor: "var(--line)" }}
            value={Number(form.temperature ?? 0.7)}
            onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })} />
        </label>
      </div>
      <button className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--seat-5)", color: "#fff" }}>Save seat</button>
    </form>
  );
}

export function SeatGrid({ agents, onSave }: { agents: Array<Record<string, unknown>>; onSave: (id: string, p: Record<string, unknown>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {agents.map((a) => (
        <SeatForm key={String(a.id)} agent={a} onSave={(p) => onSave(String(a.id), p)} />
      ))}
    </div>
  );
}
