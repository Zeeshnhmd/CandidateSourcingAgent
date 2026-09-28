import { describe, expect, it } from 'vitest';
import type { GitHubRepo, GitHubUser } from '../github/githubClient';
import { summarizeGitHubActivity } from './githubEvidenceAdapter';

const user: GitHubUser = {
  login: 'user',
  name: 'Test User',
  html_url: 'https://github.com/user',
  avatar_url: null,
  company: null,
  location: null,
  bio: null,
  public_repos: 4,
  followers: 12,
  updated_at: null,
};

const repo = (overrides: Partial<GitHubRepo>): GitHubRepo => ({
  name: 'repo',
  description: null,
  language: 'TypeScript',
  stargazers_count: 0,
  created_at: '2020-01-01T00:00:00Z',
  pushed_at: '2026-08-20T00:00:00Z',
  topics: [],
  fork: false,
  html_url: 'https://github.com/user/repo',
  ...overrides,
});

describe('summarizeGitHubActivity', () => {
  it('summarises owned repositories into scoring evidence', () => {
    const evidence = summarizeGitHubActivity(
      user,
      [
        repo({ name: 'popular', stargazers_count: 300 }),
        repo({ name: 'old', language: 'Go', stargazers_count: 20, pushed_at: '2024-01-01T00:00:00Z' }),
        repo({ name: 'side', stargazers_count: 5 }),
        repo({ name: 'forked', stargazers_count: 9000, fork: true }),
      ],
      new Date('2026-09-01T00:00:00Z'),
    );

    expect(evidence).toMatchObject({ mode: 'live', totalStars: 325, recentlyActiveRepos: 2, publicRepos: 4 });
    expect(evidence.topLanguages).toEqual([
      { name: 'TypeScript', repoCount: 2 },
      { name: 'Go', repoCount: 1 },
    ]);
    expect(evidence.notableRepos.map((item) => item.name)).toEqual(['popular', 'old', 'side']);
  });
});
