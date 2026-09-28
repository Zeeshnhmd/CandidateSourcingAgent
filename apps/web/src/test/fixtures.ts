import type { CandidatePersona, MatchScore, RankedCandidate } from '@csa/contracts';

export const persona: CandidatePersona = {
  roleTitle: 'Senior Frontend Engineer',
  seniority: 'senior',
  minYearsExperience: 5,
  maxYearsExperience: null,
  mustHaveSkills: ['React', 'TypeScript'],
  niceToHaveSkills: ['Next.js'],
  location: 'Bengaluru, India',
  workMode: 'hybrid',
  isTechnicalRole: true,
  summary: 'Senior frontend engineer',
};

export const score: MatchScore = {
  total: 82,
  tier: 'strong',
  applicableWeight: 90,
  policyVersion: 'test',
  components: [
    {
      key: 'mustHaveSkills',
      label: 'Must-have skills',
      weight: 30,
      ratio: 1,
      points: 30,
      applicable: true,
      detail: '2 of 2 matched',
    },
    {
      key: 'experience',
      label: 'Relevant experience',
      weight: 25,
      ratio: 0.8,
      points: 20,
      applicable: true,
      detail: '4 relevant years (5+ required)',
    },
    {
      key: 'technicalEvidence',
      label: 'Technical evidence',
      weight: 10,
      ratio: 0,
      points: 0,
      applicable: false,
      detail: 'Excluded: GitHub rate limit reached',
    },
  ],
};

export function rankedCandidate(overrides: {
  id: string;
  fullName: string;
  tier?: MatchScore['tier'];
  skills?: string[];
  country?: string;
  openToRemote?: boolean;
  hasEvidence?: boolean;
  source?: string;
}): RankedCandidate {
  return {
    rank: 1,
    candidate: {
      id: overrides.id,
      fullName: overrides.fullName,
      headline: 'Engineer',
      currentTitle: 'Frontend Engineer',
      currentCompany: 'Acme',
      location: { city: null, country: overrides.country ?? 'India', label: overrides.country ?? 'India' },
      openToRemote: overrides.openToRemote ?? false,
      openToRelocation: false,
      totalYearsExperience: 5,
      skills: (overrides.skills ?? ['React']).map((name) => ({ name, sourceRecordIds: [overrides.id] })),
      experience: [],
      education: [],
      certifications: [],
      summary: '',
      profileUrl: null,
      githubUsername: null,
      avatarUrl: null,
      publicActivitySince: null,
      sourceRecords: [
        {
          sourceId: overrides.source === 'GitHub' ? 'github' : 'mock-talent',
          sourceName: overrides.source ?? 'Talent Network',
          capability: 'DISCOVER',
          externalId: overrides.id,
          retrievedAt: '2026-09-01T00:00:00Z',
          isMock: overrides.source !== 'GitHub',
        },
      ],
      fieldProvenance: [],
    },
    evidence: overrides.hasEvidence
      ? { status: 'available', github: null, corroboratedSkills: [], note: null }
      : { status: 'not-found', github: null, corroboratedSkills: [], note: null },
    score: { ...score, tier: overrides.tier ?? 'strong' },
    skillMatch: { matchedMustHave: [], missingMustHave: [], matchedNiceToHave: [] },
    relevantYears: 4,
    relevantExperienceIndexes: [],
    explanation: { text: 'Explanation', generatedBy: 'fallback' },
  };
}
