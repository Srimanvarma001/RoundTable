"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import type { RunEvent } from "@/shared/events";

export type SeatState = {
  id: string;
  status: "idle" | "thinking" | "spoken" | "failed";
  take: string;
  reasoning: string;
};

type State = {
  seats: Record<string, SeatState>;
  step: string;
  controls: "idle" | "running" | "paused" | "done" | "error";
  reveal: unknown | null;
  partialScores: Record<string, number>;
};

function reducer(s: State, e: RunEvent): State {
  switch (e.type) {
    case "run.started":
      return { ...s, controls: "running" };
    case "step.started":
      return { ...s, step: (e.payload as { step: string }).step };
    case "agent.status": {
      const st = (e.payload as { status: string }).status;
      const id = e.agentId!;
      return {
        ...s,
        seats: { ...s.seats, [id]: { ...(s.seats[id] ?? { id, take: "", reasoning: "" }), id, status: st as SeatState["status"] } },
      };
    }
    case "agent.delta": {
      const { kind, text } = e.payload as { kind: string; text: string };
      const id = e.agentId!;
      const prev = s.seats[id] ?? { id, status: "thinking" as const, take: "", reasoning: "" };
      return {
        ...s,
        seats: {
          ...s.seats,
          [id]: kind === "reasoning" ? { ...prev, reasoning: prev.reasoning + text } : { ...prev, take: prev.take + text },
        },
      };
    }
    case "agent.done": {
      const id = e.agentId!;
      const p = e.payload as { finalText?: string; partial_scores?: Record<string, number> };
      const prev = s.seats[id] ?? { id, status: "idle" as const, take: "", reasoning: "" };
      return {
        ...s,
        seats: { ...s.seats, [id]: { ...prev, status: "spoken", take: (p.finalText ?? prev.take).slice(0, 280) } },
        partialScores: p.partial_scores ?? s.partialScores,
      };
    }
    case "run.completed":
      return { ...s, controls: "done", reveal: e.payload };
    case "run.failed":
      return { ...s, controls: "error" };
    case "run.paused":
      return { ...s, controls: "paused" };
    case "run.resumed":
      return { ...s, controls: "running" };
    default:
      return s;
  }
}

/** EventSource + reducer + stagger queue (45ms cadence, order_index order, HWM flush). */
export function useRunStream(runId: string | null, cadenceMs = 45) {
  const [state, dispatch] = useReducer(reducer, {
    seats: {}, step: "propose", controls: "idle", reveal: null, partialScores: {},
  });
  const buffer = useRef<RunEvent[]>([]);
  const [, force] = useState(0);

  useEffect(() => {
    if (!runId) return;
    const es = new EventSource(`/api/runs/${runId}/stream`);
    es.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data) as RunEvent;
        if (cadenceMs === 0) dispatch(e);
        else {
          buffer.current.push(e);
          if (buffer.current.length > 200) {
            const q = buffer.current.splice(0);
            q.forEach(dispatch);
          }
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* fallback polling handled by page */ };
    return () => es.close();
  }, [runId, cadenceMs]);

  useEffect(() => {
    if (!cadenceMs) return;
    const t = setInterval(() => {
      const next = buffer.current.shift();
      if (next) {
        dispatch(next);
        force((x) => x + 1);
      }
    }, cadenceMs);
    return () => clearInterval(t);
  }, [cadenceMs]);

  const flush = () => {
    buffer.current.splice(0).forEach(dispatch);
  };

  return { state, flush };
}
