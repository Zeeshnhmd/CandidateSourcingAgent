import type { CandidateExperience, CandidateProfile, FieldProvenance, SourceRecordRef } from '@csa/contracts';
import type { EnrichmentRecord, SourceCandidateRecord } from '../../adapters/types';
import { canonicalSkill, canonicalSkills, skillKey } from '../skills/skillTaxonomy';
import { yearsCovered } from './experienceDuration';
import { parseLocation } from './location';

function provenance(field: string, source: SourceRecordRef): FieldProvenance {
  return {
    field,
    sourceId: source.sourceId,
    sourceName: source.sourceName,
    externalId: source.externalId,
    retrievedAt: source.retrievedAt,
  };
}

/**
 * Builds one canonical candidate from the records of a resolved identity and their enrichments.
 * Scalar fields come from the freshest record, list fields are merged with per-record provenance.
 */
export function normalizeCandidate(
  records: readonly SourceCandidateRecord[],
  enrichments: readonly EnrichmentRecord[],
  now: Date,
): CandidateProfile {
  const [primary] = records;
  if (!primary) throw new Error('normalizeCandidate requires at least one record');

  const skills = new Map<string, { name: string; sourceRecordIds: Set<string> }>();
  const addSkills = (names: readonly string[], source: SourceRecordRef) => {
    for (const raw of names) {
      const name = canonicalSkill(raw);
      const key = skillKey(name);
      if (!key) continue;
      const entry = skills.get(key) ?? { name, sourceRecordIds: new Set<string>() };
      entry.sourceRecordIds.add(source.externalId);
      skills.set(key, entry);
    }
  };

  const experience = new Map<string, CandidateExperience>();
  for (const record of records) {
    addSkills([...record.skills, ...record.experience.flatMap((item) => item.skills)], record.source);
    for (const item of record.experience) {
      const key = `${item.title}|${item.company}|${item.startDate}`.toLowerCase();
      if (!experience.has(key)) experience.set(key, { ...item, skills: canonicalSkills(item.skills) });
    }
  }
  for (const enrichment of enrichments) addSkills(enrichment.skills, enrichment.source);

  const publicActivitySince =
    records
      .map((record) => record.publicActivitySince)
      .filter((date): date is string => date !== null)
      .sort()[0] ?? null;
  const sortedExperience = [...experience.values()].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const education = enrichments.flatMap((item) => item.education);
  const certifications = [...new Set(enrichments.flatMap((item) => item.certifications))];

  const scalarFields = ['fullName', 'headline', 'currentTitle', 'currentCompany', 'location', 'summary'];
  const fieldProvenance: FieldProvenance[] = [
    ...scalarFields.map((field) => provenance(field, primary.source)),
    ...records.map((record) => provenance('skills and experience', record.source)),
    ...enrichments.flatMap((item) => [
      provenance('skills', item.source),
      ...(item.education.length ? [provenance('education', item.source)] : []),
      ...(item.certifications.length ? [provenance('certifications', item.source)] : []),
    ]),
  ];

  return {
    id: primary.source.externalId,
    fullName: primary.fullName.replace(/\s+/g, ' ').trim(),
    headline: primary.headline,
    currentTitle: primary.currentTitle,
    currentCompany: primary.currentCompany,
    location: parseLocation(primary.locationText),
    openToRemote: primary.openToRemote,
    openToRelocation: primary.openToRelocation,
    totalYearsExperience: sortedExperience.length
      ? yearsCovered(sortedExperience, now)
      : publicActivitySince
        ? yearsCovered([{ startDate: publicActivitySince, endDate: null }], now)
        : 0,
    skills: [...skills.values()].map((entry) => ({ name: entry.name, sourceRecordIds: [...entry.sourceRecordIds] })),
    experience: sortedExperience,
    education,
    certifications,
    summary: primary.summary,
    profileUrl: primary.profileUrl,
    githubUsername: records.find((record) => record.githubUsername)?.githubUsername ?? null,
    avatarUrl: records.find((record) => record.avatarUrl)?.avatarUrl ?? null,
    publicActivitySince,
    sourceRecords: [...records.map((record) => record.source), ...enrichments.map((item) => item.source)],
    fieldProvenance,
  };
}

/** Text used for semantic comparison against the persona. */
export function candidateToText(candidate: CandidateProfile): string {
  return [
    `${candidate.currentTitle}. ${candidate.headline}`,
    candidate.summary,
    `Skills: ${candidate.skills.map((skill) => skill.name).join(', ')}`,
    ...candidate.experience.slice(0, 3).map((item) => `${item.title} at ${item.company}: ${item.summary}`),
  ].join('\n');
}
