import type { GitHubEvidence } from '@csa/contracts';
import { fetchJson } from '../../shared/fetchJson';
import { isMockGitHubEvidenceRecord } from '../sources/mock-talent/mockTalentRecords';
import type { MockGitHubEvidenceAdapter, ProviderInfo } from '../types';

const MOCK_GITHUB_INFO: ProviderInfo = {
  id: 'github-mock',
  name: 'GitHub (sample)',
  capabilities: ['EVIDENCE'],
  isMock: true,
};

/** Sample GitHub evidence for talent network sample profiles. Never linked to real GitHub accounts. */
export function createMockGitHubEvidenceAdapter(options: { baseUrl: string }): MockGitHubEvidenceAdapter {
  return {
    info: MOCK_GITHUB_INFO,

    async collect(records) {
      const result = new Map<string, GitHubEvidence>();
      if (!records.length) return result;

      const params = new URLSearchParams(records.map((record): [string, string] => ['profile_id', record.externalId]));
      const payload = await fetchJson(`${options.baseUrl}/githubEvidence?${params.toString()}`, {
        provider: MOCK_GITHUB_INFO.name,
      });
      if (!Array.isArray(payload)) return result;

      for (const record of payload.filter(isMockGitHubEvidenceRecord)) {
        result.set(record.profile_id, {
          mode: 'mock',
          username: record.login,
          profileUrl: null,
          publicRepos: record.public_repos,
          followers: record.followers,
          totalStars: record.repos.reduce((sum, repo) => sum + repo.stars, 0),
          recentlyActiveRepos: record.recently_active_repos,
          topLanguages: record.languages.map((language) => ({ name: language.name, repoCount: language.repo_count })),
          notableRepos: record.repos.map((repo) => ({
            name: repo.name,
            description: repo.description,
            language: repo.language,
            stars: repo.stars,
            pushedAt: repo.pushed_at,
            topics: repo.topics,
            url: null,
          })),
          retrievedAt: record.retrieved_at,
        });
      }
      return result;
    },
  };
}
