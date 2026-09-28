import type { MatchTier, ScoreComponentKey, ScoringWeight } from '@csa/contracts';

/**
 * Single source of truth for how candidates are scored. Weights sum to 100.
 * Any change here should bump `version` so stored runs remain explainable.
 */
export const SCORING_POLICY = {
  version: '2026.09.2',
  weights: {
    mustHaveSkills: 30,
    niceToHaveSkills: 5,
    experience: 25,
    roleSeniority: 15,
    semanticRelevance: 10,
    technicalEvidence: 10,
    location: 5,
  } satisfies Record<ScoreComponentKey, number>,
  labels: {
    mustHaveSkills: 'Must-have skills',
    niceToHaveSkills: 'Nice-to-have skills',
    experience: 'Relevant experience',
    roleSeniority: 'Role and seniority',
    semanticRelevance: 'Semantic relevance',
    technicalEvidence: 'Technical evidence',
    location: 'Location and context',
  } satisfies Record<ScoreComponentKey, string>,
  tiers: { strong: 75, good: 55, partial: 35 },
  roleSeniority: {
    titleShare: 0.6,
    seniorityShare: 0.4,
    /** Ratio by distance between candidate and required seniority levels. */
    byLevelDistance: [1, 0.6, 0.25, 0],
  },
  experience: {
    /** Relevant years above max + buffer are treated as overqualified. */
    overqualifiedBufferYears: 4,
    overqualifiedRatio: 0.8,
    noRequirementWithoutRelevantRatio: 0.5,
    /** Maximum credit for experience estimated from public activity instead of employment history. */
    publicActivityRatio: 0.7,
  },
  location: {
    sameCity: 1,
    sameCountry: 0.7,
    willingToRelocate: 0.6,
    openToRemote: 0.4,
  },
  evidence: {
    skillShare: 0.5,
    activityShare: 0.3,
    depthShare: 0.2,
    skillsForFullCredit: 3,
    activeReposForFullCredit: 4,
    starsForFullCredit: 500,
  },
  /** Number of top candidates that receive AI written explanations. */
  aiExplanationLimit: 10,
} as const;

export function scoringWeights(): ScoringWeight[] {
  return (Object.keys(SCORING_POLICY.weights) as ScoreComponentKey[]).map((key) => ({
    key,
    label: SCORING_POLICY.labels[key],
    weight: SCORING_POLICY.weights[key],
  }));
}

export function tierFor(total: number): MatchTier {
  const { tiers } = SCORING_POLICY;
  if (total >= tiers.strong) return 'strong';
  if (total >= tiers.good) return 'good';
  if (total >= tiers.partial) return 'partial';
  return 'weak';
}
