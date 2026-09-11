"use client";
import { motion } from "framer-motion";
import { SeatAura } from "./SeatAura";
import { ThoughtCloud } from "./ThoughtCloud";
import { Avatar } from "./Avatar";
import { SpeechBubble } from "./SpeechBubble";
import type { AgentDTO } from "@/shared/types";

export type SeatVisual = "idle" | "thinking" | "spoken" | "failed" | "disabled";

export function Seat({
  agent, state, take, weightPct, onOpen, drawerOpen,
}: {
  agent: AgentDTO; state: SeatVisual; take: string; weightPct: number;
  onOpen: () => void; drawerOpen: boolean;
}) {
  const accent = agent.accentColor;
  const thinking = state === "thinking";
  const failed = state === "failed";
  const ring = failed ? "var(--danger)" : state === "disabled" ? "var(--line)" : accent;
  return (
    <button onClick={onOpen} aria-label={`${agent.name} — ${state}`}
      className="group absolute flex flex-col items-center focus:outline-none"
      style={{ width: "clamp(52px, 7.2vw, 92px)" }}>
      <div className="relative" style={{ width: "100%", aspectRatio: "1" }}>
        <SeatAura accent={accent} active={thinking} />
        <div className="relative h-full w-full rounded-full border-2"
          style={{
            borderColor: ring, opacity: state === "disabled" ? 0.4 : 1,
            background: `${accent}1f`, filter: state === "idle" ? "saturate(0.55)" : "saturate(1)",
            transform: thinking ? "scale(1.06)" : "scale(1)",
          }}>
          {!drawerOpen && (
            <motion.div layoutId={`avatar-${agent.id}`} className="h-full w-full rounded-full p-[3px]">
              <Avatar agent={agent} />
            </motion.div>
          )}
          {drawerOpen && <Avatar agent={agent} />}
          <span className="tnum absolute -bottom-1 -right-1 rounded-full px-1.5 text-[11px] font-semibold"
            style={{ background: "var(--bg-elev-3)", color: "var(--text)", border: "1px solid var(--line)" }}>
            {state === "disabled" ? "0%" : `${Math.round(weightPct * 100)}%`}
          </span>
        </div>
        {thinking && <ThoughtCloud accent={accent} />}
        {failed && <span className="absolute -top-2 right-0 text-lg" aria-label="error">⚠</span>}
      </div>
      <span className="mt-1 text-[13px]" style={{ color: "var(--text-dim)", textDecoration: state === "disabled" ? "line-through" : "none" }}>
        {agent.name}
      </span>
      <SpeechBubble take={state === "spoken" ? take : ""} accent={accent} />
    </button>
  );
}
