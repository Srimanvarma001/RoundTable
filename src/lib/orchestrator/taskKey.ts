/** Idempotency keys: run:{runId}:step:{step}:agent:{agentId}:round:{round}:attempt-agnostic */
export function taskKey(runId: string, step: string, agentId: string, round: number): string {
  return `run:${runId}:step:${step}:agent:${agentId}:round:${round}:attempt-agnostic`;
}
