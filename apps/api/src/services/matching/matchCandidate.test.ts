import { describe, expect, it } from 'vitest';
import type { CandidateEvidence, ScoreComponentKey } from '@csa/contracts';
import { candidate, NO_EVIDENCE, NOW, persona } from '../../test/fixtures/builders';
import { matchCandidate, rankCandidates, type MatchInput } from './matchCandidate';
import { SCORING_POLICY, tierFor } from './scoringPolicy';

const input = (overrides: Partial<MatchInput> = {}): MatchInput => ({
  persona: persona(),
  candidate: candidate(),
  evidence: NO_EVIDENCE,
  semanticRelevance: 0.8,
  now: NOW,
  ...overrides,
});

const componentOf = (result: ReturnType<typeof matchCandidate>, key: ScoreComponentKey) =>
  result.score.components.find((item) => item.key === key);

describe('scoring policy', () => {
  it('has weights that sum to 100', () => {
    expect(Object.values(SCORING_POLICY.weights).reduce((sum, weight) => sum + weight, 0)).toBe(100);
  });

  it('maps totals to tiers at the configured thresholds', () => {
    expect([tierFor(75), tierFor(74), tierFor(55), tierFor(35), tierFor(34)]).toEqual([
      'strong',
      'good',
      'good',
      'partial',
      'weak',
    ]);
  });
});

describe('matchCandidate', () => {
  it('is deterministic and explains every component', () => {
    const first = matchCandidate(input());
    expect(matchCandidate(input())).toEqual(first);
    expect(first.score.components.map((item) => item.key)).toEqual(Object.keys(SCORING_POLICY.weights));
    for (const item of first.score.components) expect(item.detail).not.toBe('');
  });

  it('scores skill coverage and reports missing must-haves', () => {
    const result = matchCandidate(
      input({
        candidate: candidate({
          skills: [
            { name: 'React', sourceRecordIds: [] },
            { name: 'TypeScript', sourceRecordIds: [] },
          ],
        }),
      }),
    );
    expect(result.skillMatch.matchedMustHave).toEqual(['React', 'TypeScript']);
    expect(result.skillMatch.missingMustHave).toEqual(['GraphQL', 'Jest']);
    expect(componentOf(result, 'mustHaveSkills')).toMatchObject({ ratio: 0.5, points: 15 });
    expect(componentOf(result, 'mustHaveSkills')?.detail).toContain('Missing GraphQL, Jest');
  });

  it('counts only relevant experience against the requirement', () => {
    const result = matchCandidate(
      input({
        candidate: candidate({
          experience: [
            { title: 'Frontend Engineer', company: 'A', startDate: '2023-10', endDate: null, summary: '', skills: [] },
            {
              title: 'Sales Associate',
              company: 'B',
              startDate: '2015-01',
              endDate: '2023-08',
              summary: '',
              skills: [],
            },
          ],
        }),
      }),
    );
    expect(result.relevantYears).toBe(3);
    expect(result.relevantExperienceIndexes).toEqual([0]);
    expect(componentOf(result, 'experience')?.ratio).toBe(0.6);
  });

  it('estimates experience from public activity only when there is no employment history', () => {
    const githubOnly = candidate({ experience: [], publicActivitySince: '2016-10-01T00:00:00Z' });
    const result = matchCandidate(input({ candidate: githubOnly }));
    expect(result.relevantYears).toBe(10);
    expect(componentOf(result, 'experience')).toMatchObject({ ratio: SCORING_POLICY.experience.publicActivityRatio });
    expect(componentOf(result, 'experience')?.detail).toMatch(
      /^Estimated 10 years from public GitHub activity since 2016/,
    );

    const unrelated = matchCandidate(
      input({ candidate: { ...githubOnly, skills: [{ name: 'Figma', sourceRecordIds: [] }] } }),
    );
    expect(unrelated.relevantYears).toBe(0);
  });

  it('excludes non-applicable components and normalises the total over the rest', () => {
    const result = matchCandidate(
      input({ persona: persona({ isTechnicalRole: false, location: null, workMode: 'unspecified' }) }),
    );
    expect(componentOf(result, 'technicalEvidence')?.applicable).toBe(false);
    expect(componentOf(result, 'location')?.applicable).toBe(false);
    expect(result.score.applicableWeight).toBe(
      100 - SCORING_POLICY.weights.technicalEvidence - SCORING_POLICY.weights.location,
    );
  });

  it('does not penalise candidates when evidence could not be retrieved', () => {
    const unavailable: CandidateEvidence = {
      status: 'unavailable',
      github: null,
      corroboratedSkills: [],
      note: 'GitHub rate limit reached',
    };
    const withoutEvidence = matchCandidate(input({ evidence: NO_EVIDENCE }));
    const excluded = matchCandidate(input({ evidence: unavailable }));
    expect(componentOf(excluded, 'technicalEvidence')?.applicable).toBe(false);
    expect(excluded.score.total).toBeGreaterThan(withoutEvidence.score.total);
  });

  it('rewards corroborated, active public evidence', () => {
    const evidence: CandidateEvidence = {
      status: 'available',
      corroboratedSkills: ['React', 'TypeScript', 'GraphQL'],
      note: null,
      github: {
        mode: 'mock',
        username: 'mock-user',
        profileUrl: null,
        publicRepos: 20,
        followers: 10,
        totalStars: 500,
        recentlyActiveRepos: 4,
        topLanguages: [],
        notableRepos: [],
        retrievedAt: NOW.toISOString(),
      },
    };
    const result = matchCandidate(input({ evidence }));
    expect(componentOf(result, 'technicalEvidence')).toMatchObject({ ratio: 1, points: 10 });
    expect(componentOf(result, 'technicalEvidence')?.detail).toMatch(/^Sample GitHub/);
  });

  it('scores location by city, country, relocation and remote roles', () => {
    const inCity = matchCandidate(input());
    const elsewhere = matchCandidate(
      input({
        candidate: candidate({
          location: { city: 'London', country: 'United Kingdom', label: 'London, United Kingdom' },
        }),
      }),
    );
    const remoteRole = matchCandidate(
      input({
        persona: persona({ workMode: 'remote' }),
        candidate: candidate({ location: { city: 'London', country: 'United Kingdom', label: 'London' } }),
      }),
    );
    expect(componentOf(inCity, 'location')?.ratio).toBe(1);
    expect(componentOf(elsewhere, 'location')?.ratio).toBe(0);
    expect(componentOf(remoteRole, 'location')?.ratio).toBe(1);
  });

  it('penalises a seniority mismatch', () => {
    const senior = matchCandidate(input());
    const junior = matchCandidate(
      input({
        candidate: candidate({ currentTitle: 'Junior Frontend Engineer', headline: 'Junior Frontend Engineer' }),
      }),
    );
    expect(componentOf(junior, 'roleSeniority')?.points).toBeLessThan(
      componentOf(senior, 'roleSeniority')?.points ?? 0,
    );
  });
});

describe('rankCandidates', () => {
  it('orders by total, then must-have coverage, then name for stable ties', () => {
    const base = matchCandidate(input());
    const make = (id: string, fullName: string, total: number, matched: number) => ({
      ...base,
      candidate: candidate({ id, fullName }),
      score: { ...base.score, total },
      skillMatch: { ...base.skillMatch, matchedMustHave: Array.from({ length: matched }, (_, index) => `s${index}`) },
    });
    const ranked = rankCandidates([
      make('3', 'Cara', 80, 3),
      make('1', 'Bea', 80, 4),
      make('2', 'Abe', 80, 3),
      make('4', 'Dan', 90, 1),
    ]);
    expect(ranked.map((item) => [item.rank, item.candidate.fullName])).toEqual([
      [1, 'Dan'],
      [2, 'Bea'],
      [3, 'Abe'],
      [4, 'Cara'],
    ]);
  });
});
