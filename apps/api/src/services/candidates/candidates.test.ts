import { describe, expect, it } from 'vitest';
import { NOW, sourceRecord, sourceRef } from '../../test/fixtures/builders';
import { yearsCovered } from './experienceDuration';
import { resolveIdentities } from './identityResolution';
import { compareLocation, parseLocation } from './location';
import { normalizeCandidate } from './normalizeCandidate';

describe('resolveIdentities', () => {
  it('merges records sharing an email regardless of case', () => {
    const result = resolveIdentities([
      sourceRecord('a', { email: 'Asha@Example.test' }),
      sourceRecord('b', { email: 'asha@example.test', profileUrl: null, currentCompany: null }),
      sourceRecord('c', { fullName: 'Someone Else', email: null, profileUrl: null }),
    ]);
    expect(result.groups.map((group) => group.map((record) => record.source.externalId))).toEqual([['a', 'b'], ['c']]);
    expect(result.duplicatesMerged).toBe(1);
  });

  it('matches profile URLs ignoring protocol and trailing slashes, and name with company', () => {
    const result = resolveIdentities([
      sourceRecord('a', { email: null, profileUrl: 'https://talent.mock/p/asha' }),
      sourceRecord('b', { email: null, profileUrl: 'http://talent.mock/p/asha/', currentCompany: null }),
      sourceRecord('c', { email: null, profileUrl: null, fullName: 'Test  Person' }),
    ]);
    expect(result.groups).toHaveLength(1);
    expect(result.duplicatesMerged).toBe(2);
  });

  it('puts the most recently updated record first', () => {
    const result = resolveIdentities([
      sourceRecord('old', { email: 'x@example.test', updatedAt: '2024-01-01T00:00:00Z' }),
      sourceRecord('new', { email: 'x@example.test', updatedAt: '2026-01-01T00:00:00Z' }),
    ]);
    expect(result.groups[0]?.[0]?.source.externalId).toBe('new');
  });
});

describe('normalizeCandidate', () => {
  it('merges skills with provenance, deduplicates experience and adds enrichment', () => {
    const primary = sourceRecord('a', { skills: ['reactjs', 'TypeScript'] });
    const duplicate = sourceRecord('b', { skills: ['React', 'GraphQL'], updatedAt: '2024-01-01T00:00:00Z' });
    const profile = normalizeCandidate(
      [primary, duplicate],
      [
        {
          source: sourceRef('enr-a', { capability: 'ENRICH' }),
          subjectExternalId: 'a',
          skills: ['Jest'],
          certifications: ['Cert A'],
          education: [{ institution: 'Uni', degree: 'BSc', endYear: 2018 }],
        },
      ],
      NOW,
    );

    expect(profile.id).toBe('a');
    expect(profile.skills).toEqual([
      { name: 'React', sourceRecordIds: ['a', 'b'] },
      { name: 'TypeScript', sourceRecordIds: ['a'] },
      { name: 'GraphQL', sourceRecordIds: ['b'] },
      { name: 'Jest', sourceRecordIds: ['enr-a'] },
    ]);
    expect(profile.experience).toHaveLength(1);
    expect(profile.certifications).toEqual(['Cert A']);
    expect(profile.sourceRecords.map((record) => record.externalId)).toEqual(['a', 'b', 'enr-a']);
    expect(profile.fieldProvenance).toContainEqual(
      expect.objectContaining({ field: 'education', externalId: 'enr-a' }),
    );
    expect(profile).not.toHaveProperty('email');
  });
});

describe('yearsCovered', () => {
  it('counts overlapping periods once and open ranges until now', () => {
    const years = yearsCovered(
      [
        { startDate: '2020-01', endDate: '2021-12' },
        { startDate: '2021-01', endDate: null },
      ],
      new Date('2025-12-15T00:00:00Z'),
    );
    expect(years).toBe(6);
  });
});

describe('location', () => {
  it('parses city and country and compares with aliases', () => {
    const location = parseLocation('Bengaluru, India');
    expect(location).toEqual({ city: 'Bengaluru', country: 'India', label: 'Bengaluru, India' });
    expect(compareLocation('Bangalore', location)).toBe('same-city');
    expect(compareLocation('Pune, India', location)).toBe('same-country');
    expect(compareLocation('London, UK', location)).toBe('none');
    expect(compareLocation('London', parseLocation('London, United Kingdom'))).toBe('same-city');
    expect(compareLocation('Remote UK', parseLocation('Leeds, United Kingdom'))).toBe('same-country');
  });
});
