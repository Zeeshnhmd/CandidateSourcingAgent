import type { AiProvider, CandidatePersona } from '@csa/contracts';
import type { MatchExplanationInput } from '../../services/matching/matchExplanation';
import type { ProviderInfo } from '../types';

export interface AiAdapter {
  readonly info: ProviderInfo;
  readonly provider: AiProvider;
  /**
   * Cosine similarity range mapped to 0 and 1 relevance. Embedding models have
   * different similarity distributions, so calibration belongs to the adapter.
   */
  readonly embeddingCalibration: { floor: number; ceiling: number };
  analyzeJobDescription(jobDescription: string): Promise<CandidatePersona>;
  embed(texts: string[]): Promise<number[][]>;
  /** Returns explanation text keyed by candidate id. Missing ids fall back to templates. */
  explainMatches(inputs: MatchExplanationInput[], persona: CandidatePersona): Promise<Map<string, string>>;
}
