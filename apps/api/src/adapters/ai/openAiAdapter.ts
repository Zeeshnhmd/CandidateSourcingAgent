import { SENIORITY_LEVELS, WORK_MODES, type CandidatePersona } from '@csa/contracts';
import type { OpenAiConfig } from '../../config/env';
import { parsePersona } from '../../services/job-analysis/persona';
import type { MatchExplanationInput } from '../../services/matching/matchExplanation';
import { fetchJson, UpstreamError } from '../../shared/fetchJson';
import { isFiniteNumber, isRecord, isString } from '../../shared/guards';
import type { AiAdapter } from './types';

const API_BASE = 'https://api.openai.com/v1';
const MAX_JD_CHARS = 12_000;

const ANALYZE_PROMPT = `You extract a structured candidate persona from a job description for a recruiter.
Return only a JSON object with exactly these keys:
- roleTitle: string, the job title without company name
- seniority: one of ${SENIORITY_LEVELS.join(', ')}
- minYearsExperience: number or null
- maxYearsExperience: number or null
- mustHaveSkills: string[] of concrete skills, tools or technologies that are required (max 10)
- niceToHaveSkills: string[] of skills described as preferred, bonus or nice to have (max 10)
- location: string or null, city and country if stated
- workMode: one of ${WORK_MODES.join(', ')}
- isTechnicalRole: boolean, true for engineering, data, ML, DevOps or QA roles
- summary: string, one sentence describing the ideal candidate
Use only information present in the job description. Use short canonical skill names such as "React", "Node.js", "AWS".`;

const EXPLAIN_PROMPT = `You write concise match explanations for recruiters reviewing a ranked shortlist.
For each candidate write one or two plain sentences, at most 45 words, based only on the facts provided.
Mention the strongest reasons and the most important gap. Do not invent skills, employers or numbers.
Do not mention or change the score, and do not make a hiring recommendation. Do not use em dashes.
Return only a JSON object: {"explanations": [{"id": string, "text": string}]}`;

function readChatContent(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return null;
  const [choice] = payload.choices as unknown[];
  if (!isRecord(choice) || !isRecord(choice.message) || !isString(choice.message.content)) return null;
  try {
    return JSON.parse(choice.message.content) as unknown;
  } catch {
    return null;
  }
}

export function createOpenAiAdapter(config: OpenAiConfig): AiAdapter {
  const headers = { Authorization: `Bearer ${config.apiKey}` };

  const chatJson = async (system: string, user: string, timeoutMs: number) => {
    const payload = await fetchJson(`${API_BASE}/chat/completions`, {
      provider: 'OpenAI',
      method: 'POST',
      headers,
      timeoutMs,
      body: {
        model: config.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
    });
    return readChatContent(payload);
  };

  return {
    info: { id: 'openai', name: `OpenAI ${config.model}`, capabilities: ['ANALYZE', 'EMBEDDING'], isMock: false },
    provider: 'openai',
    embeddingCalibration: { floor: 0.2, ceiling: 0.6 },

    async analyzeJobDescription(jobDescription): Promise<CandidatePersona> {
      const content = await chatJson(ANALYZE_PROMPT, jobDescription.slice(0, MAX_JD_CHARS), 25_000);
      const persona = parsePersona(content);
      if (!persona) throw new UpstreamError('OpenAI', null, 'OpenAI returned an unusable persona');
      return persona;
    },

    async embed(texts) {
      const payload = await fetchJson(`${API_BASE}/embeddings`, {
        provider: 'OpenAI',
        method: 'POST',
        headers,
        timeoutMs: 20_000,
        body: { model: config.embeddingModel, input: texts },
      });
      const data = isRecord(payload) && Array.isArray(payload.data) ? (payload.data as unknown[]) : [];
      const vectors: number[][] = [];
      for (const item of data) {
        if (!isRecord(item) || !isFiniteNumber(item.index) || !Array.isArray(item.embedding)) continue;
        const embedding = item.embedding as unknown[];
        if (embedding.every(isFiniteNumber)) vectors[item.index] = embedding;
      }
      if (vectors.length !== texts.length || vectors.some((vector) => vector === undefined)) {
        throw new UpstreamError('OpenAI', null, 'OpenAI returned incomplete embeddings');
      }
      return vectors;
    },

    async explainMatches(inputs: MatchExplanationInput[], persona) {
      const facts = {
        role: { title: persona.roleTitle, seniority: persona.seniority, mustHaveSkills: persona.mustHaveSkills },
        candidates: inputs.map((input) => ({
          id: input.candidateId,
          name: input.fullName,
          currentTitle: input.currentTitle,
          matchedMustHave: input.skillMatch.matchedMustHave,
          missingMustHave: input.skillMatch.missingMustHave,
          matchedNiceToHave: input.skillMatch.matchedNiceToHave,
          breakdown: input.score.components
            .filter((item) => item.applicable)
            .map((item) => ({ factor: item.label, detail: item.detail })),
        })),
      };
      const content = await chatJson(EXPLAIN_PROMPT, JSON.stringify(facts), 30_000);
      const result = new Map<string, string>();
      const knownIds = new Set(inputs.map((input) => input.candidateId));
      const explanations =
        isRecord(content) && Array.isArray(content.explanations) ? (content.explanations as unknown[]) : [];
      for (const item of explanations) {
        if (isRecord(item) && isString(item.id) && isString(item.text) && knownIds.has(item.id)) {
          result.set(
            item.id,
            item.text
              .replace(/\s*[—–]\s*/g, ' - ')
              .trim()
              .slice(0, 400),
          );
        }
      }
      return result;
    },
  };
}
