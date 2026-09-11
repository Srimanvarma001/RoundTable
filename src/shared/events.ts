import type { StepName } from "./constants";

export type RunEventType =
  | "run.started"
  | "step.started"
  | "agent.status"
  | "agent.delta"
  | "agent.done"
  | "agent.failed"
  | "step.completed"
  | "budget.warning"
  | "run.paused"
  | "run.resumed"
  | "run.completed"
  | "run.failed"
  | "run.aborted";

export interface RunEvent {
  seq: number;
  runId: string;
  type: RunEventType;
  agentId?: string;
  step?: StepName;
  payload: unknown;
  createdAt: number;
}
