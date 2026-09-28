import type { Capability, RankedCandidate, ScoreComponentKey } from './candidate';
import type { AiProvider, CandidatePersona } from './persona';

export type PipelineStage = 'discover' | 'resolve' | 'enrich' | 'evidence' | 'embed' | 'score' | 'explain';

export type PlanStepStatus = 'completed' | 'partial' | 'skipped' | 'failed';

export interface SourcePlanStep {
  stage: PipelineStage;
  capability: Capability | null;
  providerId: string;
  providerName: string;
  description: string;
  status: PlanStepStatus;
  detail: string;
  durationMs: number;
}

export interface SourcingRunStats {
  discoveredRecords: number;
  duplicatesMerged: number;
  uniqueCandidates: number;
  enrichedCandidates: number;
  liveEvidence: number;
  mockEvidence: number;
}

export interface ScoringWeight {
  key: ScoreComponentKey;
  label: string;
  weight: number;
}

export interface SourcingRun {
  id: string;
  createdAt: string;
  persona: CandidatePersona;
  plan: SourcePlanStep[];
  stats: SourcingRunStats;
  candidates: RankedCandidate[];
  scoring: { policyVersion: string; weights: ScoringWeight[] };
  aiProvider: AiProvider;
  warnings: string[];
}

/** Compact view of a saved run for listings. */
export interface SourcingRunSummary {
  id: string;
  createdAt: string;
  roleTitle: string;
  seniority: CandidatePersona['seniority'];
  location: string | null;
  workMode: CandidatePersona['workMode'];
  mustHaveSkills: string[];
  candidateCount: number;
  strongCount: number;
  topCandidate: { name: string; score: number } | null;
  sources: string[];
  aiProvider: AiProvider;
}

export interface StartSourcingRequest {
  persona: CandidatePersona;
}
