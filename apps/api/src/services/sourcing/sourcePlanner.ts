import type { Capability, CandidatePersona, PipelineStage } from '@csa/contracts';
import type { DiscoveryAdapter, DiscoveryQuery, EnrichmentAdapter, ProviderInfo } from '../../adapters/types';
import { domainTokens } from '../matching/roleTitle';
import { SCORING_POLICY } from '../matching/scoringPolicy';

export interface SourceRegistry {
  discovery: readonly DiscoveryAdapter[];
  enrichment: readonly EnrichmentAdapter[];
  evidence: ProviderInfo;
  ai: ProviderInfo;
}

export interface PlannedStep {
  stage: PipelineStage;
  capability: Capability | null;
  providerId: string;
  providerName: string;
  description: string;
  /** Set when the planner decides the step should not run for this persona. */
  skipReason: string | null;
}

export interface SourcePlan {
  query: DiscoveryQuery;
  steps: PlannedStep[];
}

const DISCOVERY_LIMIT = 100;

function step(
  stage: PipelineStage,
  provider: Pick<ProviderInfo, 'id' | 'name'>,
  capability: Capability | null,
  description: string,
  skipReason: string | null = null,
): PlannedStep {
  return { stage, capability, providerId: provider.id, providerName: provider.name, description, skipReason };
}

/** Decides which providers run for a persona and what each is asked to do. Pure and deterministic. */
export function planSourcing(persona: CandidatePersona, registry: SourceRegistry): SourcePlan {
  const keywords = [
    ...new Set([...persona.mustHaveSkills, ...persona.niceToHaveSkills, ...domainTokens(persona.roleTitle)]),
  ];
  const location = persona.workMode === 'remote' ? null : persona.location;
  const preview = keywords.slice(0, 4).join(', ') + (keywords.length > 4 ? ` and ${keywords.length - 4} more` : '');

  const steps: PlannedStep[] = [
    ...registry.discovery.map((adapter) =>
      step(
        'discover',
        adapter.info,
        'DISCOVER',
        `Search ${adapter.info.name} for ${preview || 'the role'}${location ? ` near ${location}` : ''}`,
        adapter.info.technicalRolesOnly && !persona.isTechnicalRole
          ? `${adapter.info.name} is only searched for technical roles`
          : null,
      ),
    ),
    step(
      'resolve',
      { id: 'identity-resolution', name: 'Identity resolution' },
      null,
      'Merge duplicate records by email, profile URL, GitHub handle and name with company',
    ),
    ...registry.enrichment.map((adapter) =>
      step(
        'enrich',
        adapter.info,
        'ENRICH',
        `Add education, certifications and extra skills from ${adapter.info.name}`,
      ),
    ),
    step(
      'evidence',
      registry.evidence,
      'EVIDENCE',
      'Collect public GitHub evidence, live for configured real usernames and labelled mock otherwise',
      persona.isTechnicalRole ? null : 'Not a technical role, so public code evidence is not scored',
    ),
    step('embed', registry.ai, 'EMBEDDING', 'Compare each profile with the persona for semantic relevance'),
    step(
      'score',
      { id: 'matching-engine', name: 'Matching engine' },
      null,
      `Apply deterministic scoring policy ${SCORING_POLICY.version}`,
    ),
    step(
      'explain',
      registry.ai,
      'ANALYZE',
      `Write concise match explanations for the top ${SCORING_POLICY.aiExplanationLimit} candidates`,
    ),
  ];

  return { query: { keywords, location, limit: DISCOVERY_LIMIT }, steps };
}
