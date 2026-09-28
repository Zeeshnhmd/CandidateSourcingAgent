import type { AiProvider, CandidatePersona } from '@csa/contracts';
import type { AiAdapter } from '../../adapters/ai/types';
import type { MatchExplanationInput } from '../matching/matchExplanation';

export interface AiOutcome<T> {
  value: T;
  provider: AiProvider;
  providerName: string;
  warning: string | null;
}

export interface AiService {
  readonly primary: AiAdapter;
  analyzeJobDescription(jobDescription: string): Promise<AiOutcome<CandidatePersona>>;
  /** Calibrated 0 to 1 relevance of each document to the query. */
  semanticRelevance(query: string, documents: string[]): Promise<AiOutcome<number[]>>;
  explainMatches(inputs: MatchExplanationInput[], persona: CandidatePersona): Promise<AiOutcome<Map<string, string>>>;
}

function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

/** Runs each AI task on the primary adapter and falls back to the deterministic adapter on failure. */
export function createAiService(primary: AiAdapter, fallback: AiAdapter): AiService {
  const attempt = async <T>(task: string, run: (adapter: AiAdapter) => Promise<T>): Promise<AiOutcome<T>> => {
    const outcome = (adapter: AiAdapter, value: T, warning: string | null): AiOutcome<T> => ({
      value,
      provider: adapter.provider,
      providerName: adapter.info.name,
      warning,
    });
    if (primary === fallback) return outcome(fallback, await run(fallback), null);
    try {
      return outcome(primary, await run(primary), null);
    } catch (error) {
      console.warn(`[ai] ${task} failed on ${primary.info.name}:`, error instanceof Error ? error.message : error);
      return outcome(
        fallback,
        await run(fallback),
        `${primary.info.name} was unavailable for ${task}. The deterministic fallback was used.`,
      );
    }
  };

  return {
    primary,

    analyzeJobDescription: (jobDescription) =>
      attempt('JD analysis', (adapter) => adapter.analyzeJobDescription(jobDescription)),

    semanticRelevance: (query, documents) =>
      attempt('semantic relevance', async (adapter) => {
        const [queryVector = [], ...documentVectors] = await adapter.embed([query, ...documents]);
        const { floor, ceiling } = adapter.embeddingCalibration;
        return documentVectors.map((vector) => {
          const calibrated = (cosine(queryVector, vector) - floor) / (ceiling - floor);
          return Math.round(Math.min(1, Math.max(0, calibrated)) * 1000) / 1000;
        });
      }),

    explainMatches: (inputs, persona) =>
      attempt('match explanations', (adapter) => adapter.explainMatches(inputs, persona)),
  };
}
