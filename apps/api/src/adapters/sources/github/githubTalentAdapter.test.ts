import { describe, expect, it, vi } from 'vitest';
import type { GitHubClient, GitHubRepo, GitHubUser } from '../../github/githubClient';
import {
  buildUserSearchQuery,
  createGitHubTalentAdapter,
  locationTerms,
  primaryLanguage,
  toGitHubCandidateRecord,
} from './githubTalentAdapter';

const user = (login: string, overrides: Partial<GitHubUser> = {}): GitHubUser => ({
  login,
  name: null,
  html_url: `https://github.com/${login}`,
  avatar_url: `https://avatars.example/${login}`,
  company: '@acme',
  location: 'Bangalore, India',
  bio: 'Senior frontend engineer building design systems with React',
  public_repos: 20,
  followers: 150,
  updated_at: '2026-08-01T00:00:00Z',
  ...overrides,
});

const repo = (overrides: Partial<GitHubRepo>): GitHubRepo => ({
  name: 'repo',
  description: null,
  language: 'TypeScript',
  stargazers_count: 10,
  created_at: '2019-05-01T00:00:00Z',
  pushed_at: '2026-08-01T00:00:00Z',
  topics: ['nextjs', 'not-a-skill'],
  fork: false,
  html_url: 'https://github.com/x/repo',
  ...overrides,
});

describe('GitHub search query building', () => {
  it('prefers an explicit language skill, then a language implied by frameworks', () => {
    expect(primaryLanguage(['React', 'TypeScript'])).toBe('TypeScript');
    expect(primaryLanguage(['Django', 'SQL'])).toBe('Python');
    expect(primaryLanguage(['Figma'])).toBeNull();
  });

  it('widens location from city to aliases to country', () => {
    expect(locationTerms('Bengaluru, India')).toEqual(['Bengaluru', 'Bangalore', 'India', null]);
    expect(locationTerms(null)).toEqual([null]);
  });

  it('quotes multi-word values', () => {
    expect(buildUserSearchQuery('TypeScript', 'San Francisco')).toBe(
      'language:TypeScript location:"San Francisco" type:user repos:>=5 followers:>=15',
    );
  });
});

describe('toGitHubCandidateRecord', () => {
  it('maps a public profile without inventing employment history or contact details', () => {
    const record = toGitHubCandidateRecord(
      user('dev'),
      [
        repo({}),
        repo({ name: 'older', language: 'Go', created_at: '2016-02-01T00:00:00Z' }),
        repo({ name: 'fork', fork: true, created_at: '2010-01-01T00:00:00Z' }),
      ],
      '2026-09-01T00:00:00Z',
    );

    expect(record).toMatchObject({
      fullName: 'dev',
      currentTitle: 'Senior Frontend Engineer',
      currentCompany: 'acme',
      githubUsername: 'dev',
      email: null,
      experience: [],
      publicActivitySince: '2016-02-01T00:00:00Z',
      source: { sourceId: 'github', externalId: 'gh:dev', isMock: false },
    });
    expect(record.skills).toEqual(['TypeScript', 'Go', 'Next.js', 'Design Systems', 'React']);
  });
});

describe('createGitHubTalentAdapter', () => {
  it('searches by language and location, widening until enough candidates are found', async () => {
    const searchUsers = vi
      .fn<GitHubClient['searchUsers']>()
      .mockResolvedValueOnce(['a'])
      .mockResolvedValueOnce(['a', 'b']);
    const client: GitHubClient = {
      authenticated: true,
      searchUsers,
      getUser: (login) => Promise.resolve(user(login)),
      getRepos: () => Promise.resolve([repo({})]),
      rateLimit: () => Promise.reject(new Error('unused')),
    };
    const adapter = createGitHubTalentAdapter({ client, maxCandidates: 2 });

    const records = await adapter.discover({
      keywords: ['React', 'frontend'],
      location: 'Bengaluru, India',
      limit: 100,
    });

    expect(searchUsers.mock.calls.map(([query]) => query)).toEqual([
      'language:TypeScript location:Bengaluru type:user repos:>=5 followers:>=15',
      'language:TypeScript location:Bangalore type:user repos:>=5 followers:>=15',
    ]);
    expect(records.map((record) => record.githubUsername)).toEqual(['a', 'b']);
  });

  it('does not search when no language can be inferred', async () => {
    const searchUsers = vi.fn<GitHubClient['searchUsers']>();
    const client = { authenticated: true, searchUsers } as unknown as GitHubClient;
    expect(
      await createGitHubTalentAdapter({ client }).discover({ keywords: ['Figma'], location: null, limit: 10 }),
    ).toEqual([]);
    expect(searchUsers).not.toHaveBeenCalled();
  });
});
