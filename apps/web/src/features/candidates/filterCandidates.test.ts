import { describe, expect, it } from 'vitest';
import { rankedCandidate } from '../../test/fixtures';
import {
  DEFAULT_FILTERS,
  filterCandidates,
  hasActiveFilters,
  locationOptions,
  sourceOptions,
} from './filterCandidates';

const candidates = [
  rankedCandidate({
    id: 'a',
    fullName: 'Asha Verma',
    tier: 'strong',
    skills: ['React', 'TypeScript'],
    hasEvidence: true,
  }),
  rankedCandidate({
    id: 'b',
    fullName: 'Ben Ode',
    tier: 'good',
    skills: ['React'],
    country: 'Germany',
    openToRemote: true,
  }),
  rankedCandidate({ id: 'c', fullName: 'Cara Lin', tier: 'weak', skills: ['Java'], source: 'GitHub' }),
];

const ids = (filters: Partial<typeof DEFAULT_FILTERS>) =>
  filterCandidates(candidates, { ...DEFAULT_FILTERS, ...filters }).map((item) => item.candidate.id);

describe('filterCandidates', () => {
  it('returns everything with default filters', () => {
    expect(ids({})).toEqual(['a', 'b', 'c']);
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it('filters by minimum tier', () => {
    expect(ids({ minimumTier: 'good' })).toEqual(['a', 'b']);
    expect(ids({ minimumTier: 'strong' })).toEqual(['a']);
  });

  it('requires every selected skill, ignoring case', () => {
    expect(ids({ requiredSkills: ['react', 'TypeScript'] })).toEqual(['a']);
  });

  it('filters by search text, location and evidence', () => {
    expect(ids({ search: '  ben ' })).toEqual(['b']);
    expect(ids({ search: 'java' })).toEqual(['c']);
    expect(ids({ location: 'remote' })).toEqual(['b']);
    expect(ids({ location: 'country:India' })).toEqual(['a', 'c']);
    expect(ids({ evidenceOnly: true })).toEqual(['a']);
  });

  it('filters by discovery source and lists the available sources', () => {
    expect(ids({ source: 'GitHub' })).toEqual(['c']);
    expect(sourceOptions(candidates)).toEqual(['GitHub', 'Talent Network']);
  });

  it('builds location options from candidate countries', () => {
    expect(locationOptions(candidates).map((option) => option.value)).toEqual([
      'remote',
      'country:Germany',
      'country:India',
    ]);
  });
});
