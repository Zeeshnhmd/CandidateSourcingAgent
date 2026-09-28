import type { SourceRecordRef } from '@csa/contracts';
import { fetchJson } from '../../../shared/fetchJson';
import { skillKey } from '../../../services/skills/skillTaxonomy';
import type {
  DiscoveryAdapter,
  DiscoveryQuery,
  EnrichmentAdapter,
  EnrichmentRecord,
  ProviderInfo,
  SourceCandidateRecord,
} from '../../types';
import { isMockTalentEnrichment, isMockTalentProfile, type MockTalentProfile } from './mockTalentRecords';

const MOCK_TALENT_INFO: ProviderInfo = {
  id: 'mock-talent',
  name: 'Talent Network',
  capabilities: ['DISCOVER', 'ENRICH'],
  isMock: true,
};

function matchesKeywords(profile: MockTalentProfile, keywords: string[]): boolean {
  const skills = new Set([...profile.skills, ...profile.positions.flatMap((p) => p.tech)].map(skillKey));
  const titles = [profile.current_title, profile.headline, ...profile.positions.map((p) => p.title)];
  const text = ` ${titles
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, ' ')} `;
  return keywords.some((keyword) => skills.has(skillKey(keyword)) || text.includes(` ${keyword.toLowerCase()} `));
}

function toSourceRecord(profile: MockTalentProfile, retrievedAt: string): SourceCandidateRecord {
  return {
    source: {
      sourceId: MOCK_TALENT_INFO.id,
      sourceName: MOCK_TALENT_INFO.name,
      capability: 'DISCOVER',
      externalId: profile.id,
      retrievedAt,
      isMock: true,
    },
    fullName: profile.full_name,
    email: profile.email,
    profileUrl: profile.profile_url,
    githubUsername: profile.github,
    avatarUrl: null,
    publicActivitySince: null,
    headline: profile.headline,
    currentTitle: profile.current_title,
    currentCompany: profile.current_company,
    locationText: profile.location,
    openToRemote: profile.remote_ok,
    openToRelocation: profile.relocation_ok,
    skills: profile.skills,
    experience: profile.positions.map((position) => ({
      title: position.title,
      company: position.company,
      startDate: position.from,
      endDate: position.to,
      summary: position.description,
      skills: position.tech,
    })),
    summary: profile.summary,
    updatedAt: profile.updated_at,
  };
}

/**
 * Talent network provider backed by a JSON Server dataset of sample profiles. It has no real search endpoint, so the adapter
 * emulates a provider keyword search over the collection.
 */
export function createMockTalentAdapter(options: {
  baseUrl: string;
  now?: () => Date;
}): DiscoveryAdapter & EnrichmentAdapter {
  const now = options.now ?? (() => new Date());

  return {
    info: MOCK_TALENT_INFO,

    async discover(query: DiscoveryQuery) {
      const payload = await fetchJson(`${options.baseUrl}/profiles`, { provider: MOCK_TALENT_INFO.name });
      if (!Array.isArray(payload)) return [];
      const retrievedAt = now().toISOString();
      return payload
        .filter(isMockTalentProfile)
        .filter((profile) => matchesKeywords(profile, query.keywords))
        .slice(0, query.limit)
        .map((profile) => toSourceRecord(profile, retrievedAt));
    },

    async checkHealth() {
      await fetchJson(`${options.baseUrl}/profiles?_limit=1`, { provider: MOCK_TALENT_INFO.name, timeoutMs: 2_000 });
    },

    async enrich(records: readonly SourceRecordRef[]) {
      const ids = records
        .filter((record) => record.sourceId === MOCK_TALENT_INFO.id)
        .map((record) => record.externalId);
      if (!ids.length) return [];
      const params = new URLSearchParams(ids.map((id): [string, string] => ['profile_id', id]));
      const payload = await fetchJson(`${options.baseUrl}/enrichments?${params.toString()}`, {
        provider: MOCK_TALENT_INFO.name,
      });
      if (!Array.isArray(payload)) return [];
      return payload.filter(isMockTalentEnrichment).map((enrichment): EnrichmentRecord => ({
        source: {
          sourceId: MOCK_TALENT_INFO.id,
          sourceName: MOCK_TALENT_INFO.name,
          capability: 'ENRICH',
          externalId: enrichment.id,
          retrievedAt: enrichment.retrieved_at,
          isMock: true,
        },
        subjectExternalId: enrichment.profile_id,
        skills: enrichment.skills,
        certifications: enrichment.certifications,
        education: enrichment.education.map((item) => ({
          institution: item.school,
          degree: item.degree,
          endYear: item.year,
        })),
      }));
    },
  };
}
