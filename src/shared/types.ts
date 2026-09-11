import type { RunStatus, StepName } from "./constants";

export interface AgentDTO {
  id: string;
  seatKey: string;
  name: string;
  isMeAgent: boolean;
  lensPrompt: string;
  provider: "deepseek" | "glm" | "mock";
  modelId: string;
  temperature: number;
  weight: number;
  avatarStyle: "dicebear" | "lucide" | "initials";
  avatarSeed: string;
  accentColor: string;
  accentToken: string;
  enabled: boolean;
  orderIndex: number;
}

export interface ProposalDTO {
  id: string;
  agentId: string;
  round: number;
  title: string;
  description: string;
  rationale: string;
  status: string;
}

export interface CritiqueDTO {
  id: string;
  agentId: string;
  targetProposalId: string;
  stance: string;
  comment: string;
}

export interface VoteDTO {
  agentId: string;
  proposalId: string;
  score: number;
  weightedScore: number;
  comment: string;
}

export interface RunMetrics {
  winner_score: number;
  score_spread: number;
  me_alignment: boolean;
  dissent_count: number;
  distinctness: number;
  total_cost_usd: number;
}

export interface RunSnapshot {
  id: string;
  status: RunStatus;
  currentStep: StepName;
  seedPrompt: string;
  proposals: ProposalDTO[];
  critiques: CritiqueDTO[];
  votes: VoteDTO[];
  scores: Record<string, number>;
  metrics?: RunMetrics;
  winnerId?: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  llmCalls: number;
}
