import { buildTemplateExplanation } from '../../../services/matching/matchExplanation';
import type { AiAdapter } from '../types';
import { hashedEmbedding } from './hashedEmbedding';
import { parseJobDescription } from './heuristicJobParser';

/** Deterministic, offline substitute for the AI provider. Same inputs always give the same outputs. */
export function createFallbackAiAdapter(): AiAdapter {
  return {
    info: { id: 'fallback-ai', name: 'Deterministic fallback', capabilities: ['ANALYZE', 'EMBEDDING'], isMock: false },
    provider: 'fallback',
    embeddingCalibration: { floor: 0.05, ceiling: 0.45 },

    analyzeJobDescription(jobDescription) {
      return Promise.resolve(parseJobDescription(jobDescription));
    },

    embed(texts) {
      return Promise.resolve(texts.map(hashedEmbedding));
    },

    explainMatches(inputs, persona) {
      return Promise.resolve(
        new Map(inputs.map((input) => [input.candidateId, buildTemplateExplanation(input, persona)])),
      );
    },
  };
}
