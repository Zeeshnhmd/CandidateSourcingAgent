import { randomUUID } from 'node:crypto';
import type {
  CandidatePersona,
  PipelineStage,
  PlanStepStatus,
  RankedCandidate,
  SourcePlanStep,
  SourcingRun,
  SourcingRunStats,
  SourcingRunSummary,
} from '@csa/contracts';
import type { EnrichmentRecord, SourceCandidateRecord } from '../../adapters/types';
import { HttpError } from '../../shared/httpError';
import type { AiService } from '../ai/aiService';
import { resolveIdentities } from '../candidates/identityResolution';
import { candidateToText, normalizeCandidate } from '../candidates/normalizeCandidate';
import type { EvidenceService } from '../evidence/evidenceService';
import { personaToText } from '../job-analysis/persona';
import { matchCandidate, rankCandidates, type MatchResult } from '../matching/matchCandidate';
import { buildTemplateExplanation, type MatchExplanationInput } from '../matching/matchExplanation';
import { SCORING_POLICY, scoringWeights } from '../matching/scoringPolicy';
import type { RunStore } from './runStore';
import { planSourcing, type PlannedStep, type SourceRegistry } from './sourcePlanner';

export interface SourcingService {
  start(persona: CandidatePersona): Promise<SourcingRun>;
  get(runId: string): SourcingRun | null;
  list(): SourcingRunSummary[];
  delete(runId: string): boolean;
}

function toRunSummary(run: SourcingRun): SourcingRunSummary {
  const [top] = run.candidates;
  return {
    id: run.id,
    createdAt: run.createdAt,
    roleTitle: run.persona.roleTitle,
    seniority: run.persona.seniority,
    location: run.persona.location,
    workMode: run.persona.workMode,
    mustHaveSkills: run.persona.mustHaveSkills,
    candidateCount: run.candidates.length,
    strongCount: run.candidates.filter((item) => item.score.tier === 'strong').length,
    topCandidate: top ? { name: top.candidate.fullName, score: top.score.total } : null,
    sources: [
      ...new Set(
        run.plan
          .filter((step) => step.stage === 'discover' && step.status !== 'skipped')
          .map((step) => step.providerName),
      ),
    ],
    aiProvider: run.aiProvider,
  };
}

interface StepOutcome<T> {
  status: PlanStepStatus;
  detail: string;
  value: T;
}

const NOT_RUN = 'Not run';
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

function createStepTracker(planned: readonly PlannedStep[]) {
  const steps: SourcePlanStep[] = planned.map(({ skipReason, ...rest }) => ({
    ...rest,
    status: 'skipped',
    detail: skipReason ?? NOT_RUN,
    durationMs: 0,
  }));
  const find = (stage: PipelineStage, providerId?: string) =>
    steps.find((item) => item.stage === stage && (providerId === undefined || item.providerId === providerId));

  return {
    steps,
    isPlanned: (stage: PipelineStage, providerId?: string) => find(stage, providerId)?.detail === NOT_RUN,
    /** Runs a step, records its status, detail and duration, and returns its value. */
    async run<T>(stage: PipelineStage, task: () => Promise<StepOutcome<T>>, providerId?: string): Promise<T> {
      const started = performance.now();
      const outcome = await task();
      const target = find(stage, providerId);
      if (target) {
        target.status = outcome.status;
        target.detail = outcome.detail;
        target.durationMs = Math.round(performance.now() - started);
      }
      return outcome.value;
    },
    skipRemaining(reason: string) {
      for (const item of steps) if (item.detail === NOT_RUN) item.detail = reason;
    },
  };
}

interface ScoredCandidate extends MatchResult {
  candidate: RankedCandidate['candidate'];
  evidence: RankedCandidate['evidence'];
}

const toExplanationInput = (item: ScoredCandidate): MatchExplanationInput => ({
  candidateId: item.candidate.id,
  fullName: item.candidate.fullName,
  currentTitle: item.candidate.currentTitle,
  score: item.score,
  skillMatch: item.skillMatch,
});

/**
 * Orchestrates one sourcing run:
 * plan, discover, resolve identities, enrich, normalise, collect evidence, embed, score, explain.
 * Every completed run is saved to the run store as a saved search.
 */
export function createSourcingService(deps: {
  registry: SourceRegistry;
  evidence: EvidenceService;
  ai: AiService;
  runs: RunStore;
  now?: () => Date;
}): SourcingService {
  const now = deps.now ?? (() => new Date());
  const store = (run: SourcingRun) => {
    deps.runs.save(run);
    return run;
  };

  return {
    get: (runId) => deps.runs.get(runId),
    list: () => deps.runs.list().map(toRunSummary),
    delete: (runId) => deps.runs.delete(runId),

    async start(persona) {
      const startedAt = now();
      const plan = planSourcing(persona, deps.registry);
      const tracker = createStepTracker(plan.steps);
      const warnings: string[] = [];
      const stats: SourcingRunStats = {
        discoveredRecords: 0,
        duplicatesMerged: 0,
        uniqueCandidates: 0,
        enrichedCandidates: 0,
        liveEvidence: 0,
        mockEvidence: 0,
      };

      const finish = (candidates: RankedCandidate[]): SourcingRun =>
        store({
          id: `run_${randomUUID().slice(0, 8)}`,
          createdAt: startedAt.toISOString(),
          persona,
          plan: tracker.steps,
          stats,
          candidates,
          scoring: { policyVersion: SCORING_POLICY.version, weights: scoringWeights() },
          aiProvider: deps.ai.primary.provider,
          warnings,
        });

      const discoveryAdapters = deps.registry.discovery.filter((adapter) =>
        tracker.isPlanned('discover', adapter.info.id),
      );
      let discoveryFailures = 0;
      const discovered = await Promise.all(
        discoveryAdapters.map((adapter) =>
          tracker.run(
            'discover',
            async (): Promise<StepOutcome<SourceCandidateRecord[]>> => {
              try {
                const value = await adapter.discover(plan.query);
                return { status: 'completed', detail: `${value.length} matching records`, value };
              } catch (error) {
                discoveryFailures += 1;
                warnings.push(
                  `${adapter.info.name} search failed: ${errorMessage(error)} Results come from the other sources.`,
                );
                return { status: 'failed', detail: errorMessage(error), value: [] };
              }
            },
            adapter.info.id,
          ),
        ),
      );
      const records = discovered.flat();
      if (discoveryFailures === discoveryAdapters.length) {
        throw new HttpError(
          502,
          'talent_source_unavailable',
          'No candidate source is reachable right now. Check the talent network and GitHub status, then try again.',
        );
      }
      stats.discoveredRecords = records.length;
      if (!records.length) {
        tracker.skipRemaining('No candidates were discovered');
        return finish([]);
      }

      const resolution = await tracker.run('resolve', () => {
        const value = resolveIdentities(records);
        return Promise.resolve({
          status: 'completed' as const,
          detail: `${records.length} records resolved to ${value.groups.length} candidates, ${value.duplicatesMerged} duplicates merged`,
          value,
        });
      });
      stats.duplicatesMerged = resolution.duplicatesMerged;
      stats.uniqueCandidates = resolution.groups.length;

      const enrichmentBySubject = new Map<string, EnrichmentRecord[]>();
      const sourceRefs = records.map((record) => record.source);
      for (const adapter of deps.registry.enrichment) {
        const enrichments = await tracker.run(
          'enrich',
          async (): Promise<StepOutcome<EnrichmentRecord[]>> => {
            try {
              const value = await adapter.enrich(sourceRefs);
              return { status: 'completed', detail: `${value.length} enrichment records matched`, value };
            } catch (error) {
              warnings.push(
                `Enrichment from ${adapter.info.name} failed. Candidates were ranked on discovery data only.`,
              );
              return { status: 'failed', detail: errorMessage(error), value: [] };
            }
          },
          adapter.info.id,
        );
        for (const item of enrichments) {
          enrichmentBySubject.set(item.subjectExternalId, [
            ...(enrichmentBySubject.get(item.subjectExternalId) ?? []),
            item,
          ]);
        }
      }

      const profiles = resolution.groups.map((group) =>
        normalizeCandidate(
          group,
          group.flatMap((record) => enrichmentBySubject.get(record.source.externalId) ?? []),
          startedAt,
        ),
      );
      stats.enrichedCandidates = profiles.filter((profile) =>
        profile.sourceRecords.some((record) => record.capability === 'ENRICH'),
      ).length;

      const collectEvidence = async () => {
        const value = await deps.evidence.collect(persona, profiles);
        const withoutGitHub = profiles.length - value.liveCount - value.mockCount - value.failures;
        return {
          status: (value.failures === 0
            ? 'completed'
            : value.failures >= profiles.length
              ? 'failed'
              : 'partial') as PlanStepStatus,
          detail: `${value.liveCount} live and ${value.mockCount} mock profiles, ${withoutGitHub} without GitHub`,
          value,
        };
      };
      const evidence = tracker.isPlanned('evidence')
        ? await tracker.run('evidence', collectEvidence)
        : (await collectEvidence()).value;
      stats.liveEvidence = evidence.liveCount;
      stats.mockEvidence = evidence.mockCount;
      warnings.push(...evidence.warnings);

      const semantic = await tracker.run('embed', async (): Promise<StepOutcome<number[] | null>> => {
        try {
          const outcome = await deps.ai.semanticRelevance(personaToText(persona), profiles.map(candidateToText));
          if (outcome.warning) warnings.push(outcome.warning);
          return {
            status: outcome.warning ? 'partial' : 'completed',
            detail: `Computed with ${outcome.providerName}`,
            value: outcome.value,
          };
        } catch (error) {
          warnings.push('Semantic relevance could not be computed and was excluded from scoring.');
          return { status: 'failed', detail: errorMessage(error), value: null };
        }
      });

      const ranked = await tracker.run('score', () => {
        const scored: ScoredCandidate[] = profiles.map((candidate, index) => {
          const candidateEvidence = evidence.evidence.get(candidate.id) ?? {
            status: 'not-found',
            github: null,
            corroboratedSkills: [],
            note: null,
          };
          return {
            candidate,
            evidence: candidateEvidence,
            ...matchCandidate({
              persona,
              candidate,
              evidence: candidateEvidence,
              semanticRelevance: semantic?.[index] ?? null,
              now: startedAt,
            }),
          };
        });
        const value = rankCandidates(scored);
        const strong = value.filter((item) => item.score.tier === 'strong').length;
        return Promise.resolve({
          status: 'completed' as const,
          detail: `${value.length} candidates scored, ${strong} strong matches`,
          value,
        });
      });

      const top = ranked.slice(0, SCORING_POLICY.aiExplanationLimit).map(toExplanationInput);
      const written = await tracker.run(
        'explain',
        async (): Promise<
          StepOutcome<{ texts: Map<string, string>; provider: RankedCandidate['explanation']['generatedBy'] }>
        > => {
          try {
            const outcome = await deps.ai.explainMatches(top, persona);
            if (outcome.warning) warnings.push(outcome.warning);
            return {
              status: outcome.warning ? 'partial' : 'completed',
              detail: `${outcome.value.size} written by ${outcome.providerName}, ${ranked.length - outcome.value.size} from the score breakdown`,
              value: { texts: outcome.value, provider: outcome.provider },
            };
          } catch (error) {
            return {
              status: 'failed',
              detail: `${errorMessage(error)}. Explanations were built from the score breakdown.`,
              value: { texts: new Map(), provider: 'fallback' },
            };
          }
        },
      );

      return finish(
        ranked.map((item) => {
          const text = written.texts.get(item.candidate.id);
          return {
            ...item,
            explanation: text
              ? { text, generatedBy: written.provider }
              : { text: buildTemplateExplanation(toExplanationInput(item), persona), generatedBy: 'fallback' },
          };
        }),
      );
    },
  };
}
