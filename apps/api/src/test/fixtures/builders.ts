import type { CandidateEvidence, CandidatePersona, CandidateProfile, SourceRecordRef } from '@csa/contracts';
import type { SourceCandidateRecord } from '../../adapters/types';

export const NOW = new Date('2026-09-01T00:00:00Z');

export function sourceRef(externalId: string, overrides: Partial<SourceRecordRef> = {}): SourceRecordRef {
  return {
    sourceId: 'mock-talent',
    sourceName: 'Mock Talent Network',
    capability: 'DISCOVER',
    externalId,
    retrievedAt: NOW.toISOString(),
    isMock: true,
    ...overrides,
  };
}

export function sourceRecord(
  externalId: string,
  overrides: Partial<SourceCandidateRecord> = {},
): SourceCandidateRecord {
  return {
    source: sourceRef(externalId),
    fullName: 'Test Person',
    email: `${externalId}@example.test`,
    profileUrl: `https://talent.mock/profiles/${externalId}`,
    githubUsername: null,
    avatarUrl: null,
    publicActivitySince: null,
    headline: 'Frontend Engineer',
    currentTitle: 'Frontend Engineer',
    currentCompany: 'Acme',
    locationText: 'Bengaluru, India',
    openToRemote: false,
    openToRelocation: false,
    skills: ['React'],
    experience: [
      {
        title: 'Frontend Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: null,
        summary: 'Builds UI',
        skills: ['React'],
      },
    ],
    summary: 'Frontend engineer',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function persona(overrides: Partial<CandidatePersona> = {}): CandidatePersona {
  return {
    roleTitle: 'Senior Frontend Engineer',
    seniority: 'senior',
    minYearsExperience: 5,
    maxYearsExperience: null,
    mustHaveSkills: ['React', 'TypeScript', 'GraphQL', 'Jest'],
    niceToHaveSkills: ['Next.js', 'Storybook'],
    location: 'Bengaluru, India',
    workMode: 'hybrid',
    isTechnicalRole: true,
    summary: 'Senior frontend engineer for a payments platform',
    ...overrides,
  };
}

export function candidate(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: 'mt-1',
    fullName: 'Asha Verma',
    headline: 'Senior Frontend Engineer',
    currentTitle: 'Senior Frontend Engineer',
    currentCompany: 'Acme',
    location: { city: 'Bengaluru', country: 'India', label: 'Bengaluru, India' },
    openToRemote: false,
    openToRelocation: false,
    totalYearsExperience: 7,
    skills: ['React', 'TypeScript', 'GraphQL', 'Jest', 'Next.js'].map((name) => ({ name, sourceRecordIds: ['mt-1'] })),
    experience: [
      {
        title: 'Senior Frontend Engineer',
        company: 'Acme',
        startDate: '2019-09',
        endDate: null,
        summary: 'Leads the React platform',
        skills: ['React', 'TypeScript'],
      },
    ],
    education: [],
    certifications: [],
    summary: 'Frontend engineer',
    profileUrl: null,
    githubUsername: null,
    avatarUrl: null,
    publicActivitySince: null,
    sourceRecords: [sourceRef('mt-1')],
    fieldProvenance: [],
    ...overrides,
  };
}

export const NO_EVIDENCE: CandidateEvidence = { status: 'not-found', github: null, corroboratedSkills: [], note: null };
