import type { GitHubEvidence, GitHubRepoEvidence } from '@csa/contracts';
import type { GitHubClient, GitHubRepo, GitHubUser } from '../github/githubClient';
import type { LiveGitHubEvidenceAdapter, ProviderInfo } from '../types';

export const GITHUB_INFO: ProviderInfo = {
  id: 'github',
  name: 'GitHub',
  capabilities: ['EVIDENCE'],
  isMock: false,
};

const RECENT_ACTIVITY_DAYS = 90;
const NOTABLE_REPO_COUNT = 3;

/** Pure summary of a GitHub user and their public repositories into scoring evidence. */
export function summarizeGitHubActivity(user: GitHubUser, repos: GitHubRepo[], now: Date): GitHubEvidence {
  const owned = repos.filter((repo) => !repo.fork);
  const recentThreshold = now.getTime() - RECENT_ACTIVITY_DAYS * 86_400_000;

  const languageCounts = new Map<string, number>();
  for (const repo of owned) {
    if (repo.language) languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  }

  const notableRepos: GitHubRepoEvidence[] = [...owned]
    .sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name))
    .slice(0, NOTABLE_REPO_COUNT)
    .map((repo) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      pushedAt: repo.pushed_at ?? '',
      topics: repo.topics,
      url: repo.html_url,
    }));

  return {
    mode: 'live',
    username: user.login,
    profileUrl: user.html_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    totalStars: owned.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    recentlyActiveRepos: owned.filter((repo) => repo.pushed_at && Date.parse(repo.pushed_at) >= recentThreshold).length,
    topLanguages: [...languageCounts.entries()]
      .map(([name, repoCount]) => ({ name, repoCount }))
      .sort((a, b) => b.repoCount - a.repoCount || a.name.localeCompare(b.name))
      .slice(0, 5),
    notableRepos,
    retrievedAt: now.toISOString(),
  };
}

export function createGitHubEvidenceAdapter(options: {
  client: GitHubClient;
  now?: () => Date;
}): LiveGitHubEvidenceAdapter {
  const now = options.now ?? (() => new Date());
  const { client } = options;

  return {
    info: GITHUB_INFO,

    checkRateLimit: () => client.rateLimit(),

    async collect(username) {
      const user = await client.getUser(username);
      if (!user) return null;
      return summarizeGitHubActivity(user, await client.getRepos(user.login), now());
    },
  };
}
