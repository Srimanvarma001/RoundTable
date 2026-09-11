"use client";
import { motion } from "framer-motion";
import { Avatar } from "../table/Avatar";
import type { AgentDTO } from "@/shared/types";

export function ReasoningDrawer({ agent, reasoning, answer, onClose, agents, onSwitch }: {
  agent: AgentDTO | null;
  reasoning: string;
  answer: string;
  onClose: () => void;
  agents: AgentDTO[];
  onSwitch: (id: string) => void;
}) {
  if (!agent) return null;
  const hasReasoning = reasoning.trim().length > 0;
  return (
    <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-[480px] overflow-y-auto rounded-l-2xl border-l p-5"
      style={{ background: "var(--bg-elev-1)", borderColor: "var(--line)" }}
      role="dialog" aria-label={`Reasoning for ${agent.name}`}>
      <div className="mb-3 flex items-center gap-3">
        <motion.div layoutId={`avatar-${agent.id}`} className="h-11 w-11 rounded-full">
          <Avatar agent={agent} />
        </motion.div>
        <div>
          <div className="font-semibold" style={{ color: "var(--text)" }}>{agent.name}</div>
          <div className="text-xs" style={{ color: "var(--text-mute)" }}>{agent.modelId} · {agent.provider}</div>
        </div>
        <button onClick={onClose} className="ml-auto rounded-lg border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} aria-label="Close">✕</button>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {agents.map((a) => (
          <button key={a.id} onClick={() => onSwitch(a.id)} className="rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: a.id === agent.id ? a.accentColor : "var(--line)", color: "var(--text-dim)" }}>
            {a.name}
          </button>
        ))}
      </div>
      {hasReasoning ? (
        <>
          <div className="mb-1 text-[11px] uppercase tracking-widest" style={{ color: "var(--text-mute)" }}>Reasoning</div>
          <pre className="mb-4 whitespace-pre-wrap text-[13px] italic" style={{ color: "var(--text-mute)" }}>{reasoning}</pre>
          <div className="mb-1 text-[11px] uppercase tracking-widest" style={{ color: "var(--text-mute)" }}>Answer</div>
          <pre className="whitespace-pre-wrap text-[13px]" style={{ color: "var(--text)" }}>{answer}</pre>
        </>
      ) : (
        <>
          <div className="mb-2 text-xs" style={{ color: "var(--text-mute)" }}>this model does not expose its reasoning</div>
          <pre className="whitespace-pre-wrap text-[13px]" style={{ color: "var(--text)" }}>{answer}</pre>
        </>
      )}
    </div>
  );
}
