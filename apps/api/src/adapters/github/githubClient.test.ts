import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpstreamError } from '../../shared/fetchJson';
import { createGitHubClient, describeGitHubFailure } from './githubClient';

const failure = (status: number, headers: Record<string, string> = {}) =>
  new UpstreamError('GitHub', status, `GitHub responded with HTTP ${status}`, new Headers(headers));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.restoreAllMocks());

describe('describeGitHubFailure', () => {
  it('reports the primary rate limit with reset time and a token hint when unauthenticated', () => {
    const message = describeGitHubFailure(
      failure(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1790000000' }),
      false,
    );
    expect(message).toMatch(/^GitHub rate limit reached\. Resets at \d{2}:\d{2} UTC\. Set GITHUB_TOKEN/);
    expect(describeGitHubFailure(failure(429, { 'x-ratelimit-remaining': '0' }), true)).toBe(
      'GitHub rate limit reached.',
    );
  });

  it('distinguishes secondary limits, permission errors and bad tokens', () => {
    expect(describeGitHubFailure(failure(403, { 'retry-after': '60' }), true)).toBe(
      'GitHub secondary rate limit reached. Retry after 60 seconds.',
    );
    expect(describeGitHubFailure(failure(403), true)).toBe('GitHub denied the request. Check the token permissions.');
    expect(describeGitHubFailure(failure(401), true)).toMatch(/rejected the token/);
  });
});

describe('createGitHubClient', () => {
  it('sends the versioned headers and token, and caches repeated reads', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({
        login: 'octo',
        name: 'Octo Cat',
        html_url: 'https://github.com/octo',
        public_repos: 3,
        followers: 9,
        bio: '  ',
      }),
    );
    const client = createGitHubClient({ token: 'secret-token' });

    const [first, second] = await Promise.all([client.getUser('octo'), client.getUser('octo')]);
    expect(first).toMatchObject({ login: 'octo', name: 'Octo Cat', bio: null });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers['X-GitHub-Api-Version']).toBe('2026-03-10');
    expect(headers.Authorization).toBe('Bearer secret-token');
  });

  it('returns null for unknown users and skips organisations in search results', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ message: 'Not Found' }, 404))
      .mockResolvedValueOnce(
        json({
          items: [
            { login: 'dev', type: 'User' },
            { login: 'acme', type: 'Organization' },
          ],
        }),
      );
    const client = createGitHubClient({ token: null });

    expect(await client.getUser('nobody')).toBeNull();
    expect(await client.searchUsers('language:Go', { perPage: 10 })).toEqual(['dev']);
  });
});
