import type { CandidateEvidence, CandidatePersona, CandidateProfile, GitHubEvidence } from '@csa/contracts';
import type { LiveGitHubEvidenceAdapter, MockGitHubEvidenceAdapter } from '../../adapters/types';
import { canonicalSkills, findSkillsInText, skillKey } from '../skills/skillTaxonomy';

export interface EvidenceCollection {
  evidence: Map<string, CandidateEvidence>;
  liveCount: number;
  mockCount: number;
  failures: number;
  warnings: string[];
}

export interface EvidenceService {
  collect(persona: CandidatePersona, candidates: readonly CandidateProfile[]): Promise<EvidenceCollection>;
}

const NOT_APPLICABLE: CandidateEvidence = {
  status: 'not-applicable',
  github: null,
  corroboratedSkills: [],
  note: 'Technical evidence is not used for this role',
};

/** Persona skills that the public evidence supports through languages, topics or repository descriptions. */
function corroborateSkills(persona: CandidatePersona, github: GitHubEvidence): string[] {
  const evidenceSkills = canonicalSkills([
    ...github.topLanguages.map((language) => language.name),
    ...github.notableRepos.flatMap((repo) => [...(repo.language ? [repo.language] : []), ...repo.topics]),
    ...github.notableRepos.flatMap((repo) =>
      findSkillsInText(`${repo.name.replace(/[-_]/g, ' ')} ${repo.description ?? ''}`),
    ),
  ]);
  const keys = new Set(evidenceSkills.map(skillKey));
  return [...persona.mustHaveSkills, ...persona.niceToHaveSkills].filter((skill) => keys.has(skillKey(skill)));
}

function available(persona: CandidatePersona, github: GitHubEvidence): CandidateEvidence {
  return {
    status: 'available',
    github,
    corroboratedSkills: corroborateSkills(persona, github),
    note: github.mode === 'mock' ? 'Sample evidence for a talent network sample profile' : null,
  };
}

/**
 * Chooses live GitHub evidence when a real username is known (from the source or an explicit
 * `GITHUB_PROFILE_MAP` entry) and labelled mock evidence otherwise. Failures never fail the run.
 */
export function createEvidenceService(deps: {
  live: LiveGitHubEvidenceAdapter;
  mock: MockGitHubEvidenceAdapter;
  profileMap: ReadonlyMap<string, string>;
}): EvidenceService {
  const liveUsernameFor = (candidate: CandidateProfile) =>
    candidate.sourceRecords.map((record) => deps.profileMap.get(record.externalId)).find(Boolean) ??
    candidate.githubUsername;

  return {
    async collect(persona, candidates) {
      const result: EvidenceCollection = { evidence: new Map(), liveCount: 0, mockCount: 0, failures: 0, warnings: [] };
      if (!persona.isTechnicalRole) {
        for (const candidate of candidates) result.evidence.set(candidate.id, NOT_APPLICABLE);
        return result;
      }

      const liveCandidates = candidates.filter((candidate) => liveUsernameFor(candidate));
      const mockCandidates = candidates.filter((candidate) => !liveUsernameFor(candidate));
      let liveFailures = 0;

      await Promise.all(
        liveCandidates.map(async (candidate) => {
          const username = liveUsernameFor(candidate) ?? '';
          try {
            const github = await deps.live.collect(username);
            if (github) {
              result.evidence.set(candidate.id, available(persona, github));
              result.liveCount += 1;
            } else {
              result.evidence.set(candidate.id, {
                status: 'not-found',
                github: null,
                corroboratedSkills: [],
                note: `GitHub user ${username} was not found`,
              });
            }
          } catch (error) {
            liveFailures += 1;
            const reason = error instanceof Error ? error.message : 'GitHub request failed';
            result.evidence.set(candidate.id, {
              status: 'unavailable',
              github: null,
              corroboratedSkills: [],
              note: reason,
            });
          }
        }),
      );

      try {
        const discoveryRecords = mockCandidates.flatMap((candidate) =>
          candidate.sourceRecords.filter((record) => record.capability === 'DISCOVER'),
        );
        const mockEvidence = await deps.mock.collect(discoveryRecords);
        for (const candidate of mockCandidates) {
          const github = candidate.sourceRecords.map((record) => mockEvidence.get(record.externalId)).find(Boolean);
          if (github) {
            result.evidence.set(candidate.id, available(persona, github));
            result.mockCount += 1;
          } else {
            result.evidence.set(candidate.id, {
              status: 'not-found',
              github: null,
              corroboratedSkills: [],
              note: 'No public GitHub profile linked',
            });
          }
        }
      } catch (error) {
        result.failures += mockCandidates.length;
        result.warnings.push('Mock GitHub evidence could not be loaded. Evidence was excluded from scoring.');
        const note = error instanceof Error ? error.message : 'Mock evidence unavailable';
        for (const candidate of mockCandidates) {
          result.evidence.set(candidate.id, { status: 'unavailable', github: null, corroboratedSkills: [], note });
        }
      }

      if (liveFailures) {
        result.failures += liveFailures;
        result.warnings.push(
          'Some live GitHub lookups failed. Affected candidates are scored without technical evidence.',
        );
      }
      return result;
    },
  };
}
