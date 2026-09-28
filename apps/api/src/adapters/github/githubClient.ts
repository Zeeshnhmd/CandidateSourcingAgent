import { fetchJson, UpstreamError } from '../../shared/fetchJson';
import { asStringArray, isFiniteNumber, isNullableString, isRecord, isString } from '../../shared/guards';

const API_BASE = 'https://api.github.com';
/** Latest REST API version. 2022-11-28 remains supported until 2028-03-10. */
const API_VERSION = '2026-03-10';
const PROVIDER = 'GitHub';

export interface GitHubUser {
  login: string;
  name: string | null;
  html_url: string;
  avatar_url: string | null;
  company: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  updated_at: string | null;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  created_at: string | null;
  pushed_at: string | null;
  topics: string[];
  fork: boolean;
  html_url: string;
}

export interface GitHubRateLimit {
  authenticated: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface GitHubClient {
  readonly authenticated: boolean;
  /** Returns `null` when the user does not exist. */
  getUser(login: string): Promise<GitHubUser | null>;
  /** Owned public repositories, most recently pushed first. */
  getRepos(login: string): Promise<GitHubRepo[]>;
  /** Logins matching a GitHub user search query, in GitHub's order. */
  searchUsers(query: string, options: { perPage: number; sort?: 'followers' | 'repositories' }): Promise<string[]>;
  /** Core rate limit. Calling it does not count against the limit. */
  rateLimit(): Promise<GitHubRateLimit>;
}

function toGitHubUser(value: unknown): GitHubUser | null {
  if (
    !isRecord(value) ||
    !isString(value.login) ||
    !isString(value.html_url) ||
    !isFiniteNumber(value.public_repos) ||
    !isFiniteNumber(value.followers)
  ) {
    return null;
  }
  const text = (field: unknown) => (isString(field) && field.trim() ? field.trim() : null);
  return {
    login: value.login,
    name: text(value.name),
    html_url: value.html_url,
    avatar_url: text(value.avatar_url),
    company: text(value.company),
    location: text(value.location),
    bio: text(value.bio),
    public_repos: value.public_repos,
    followers: value.followers,
    updated_at: text(value.updated_at),
  };
}

function toGitHubRepo(value: unknown): GitHubRepo | null {
  if (
    !isRecord(value) ||
    !isString(value.name) ||
    !isNullableString(value.description) ||
    !isNullableString(value.language) ||
    !isFiniteNumber(value.stargazers_count) ||
    !isNullableString(value.pushed_at) ||
    typeof value.fork !== 'boolean' ||
    !isString(value.html_url)
  ) {
    return null;
  }
  return {
    name: value.name,
    description: value.description,
    language: value.language,
    stargazers_count: value.stargazers_count,
    created_at: isString(value.created_at) ? value.created_at : null,
    pushed_at: value.pushed_at,
    topics: asStringArray(value.topics),
    fork: value.fork,
    html_url: value.html_url,
  };
}

const timeOfDay = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

/**
 * Turns a failed GitHub response into an actionable message, following GitHub's rate limit guidance:
 * a 403 or 429 with `x-ratelimit-remaining: 0` is the primary limit, `retry-after` signals a secondary limit.
 */
export function describeGitHubFailure(error: UpstreamError, authenticated: boolean): string {
  const remaining = error.headers?.get('x-ratelimit-remaining');
  const reset = Number(error.headers?.get('x-ratelimit-reset'));
  const retryAfter = error.headers?.get('retry-after');

  if (error.status === 401) return 'GitHub rejected the token. Check GITHUB_TOKEN in apps/api/.env';
  if (error.status === 403 || error.status === 429) {
    if (remaining === '0') {
      const resetAt =
        Number.isFinite(reset) && reset > 0 ? ` Resets at ${timeOfDay.format(new Date(reset * 1000))}.` : '';
      const hint = authenticated ? '' : ' Set GITHUB_TOKEN for 5,000 requests per hour.';
      return `GitHub rate limit reached.${resetAt}${hint}`;
    }
    if (retryAfter) return `GitHub secondary rate limit reached. Retry after ${retryAfter} seconds.`;
    return 'GitHub denied the request. Check the token permissions.';
  }
  if (error.status === 422) return 'GitHub could not process the search query.';
  return error.message;
}

/**
 * GitHub REST client shared by the discovery and evidence adapters. Successful responses are cached,
 * and concurrent requests for the same path share one call, so a candidate found through search
 * costs nothing extra when its evidence is collected.
 */
export function createGitHubClient(options: { token: string | null; cacheTtlMs?: number }): GitHubClient {
  const cacheTtlMs = options.cacheTtlMs ?? 15 * 60_000;
  const authenticated = options.token !== null;
  const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'candidate-sourcing-agent',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };

  const send = async (path: string): Promise<unknown> => {
    try {
      return await fetchJson(`${API_BASE}${path}`, { provider: PROVIDER, headers, timeoutMs: 12_000 });
    } catch (error) {
      if (error instanceof UpstreamError && error.status !== 404) {
        throw new UpstreamError(PROVIDER, error.status, describeGitHubFailure(error, authenticated), error.headers);
      }
      throw error;
    }
  };

  const cached = (path: string): Promise<unknown> => {
    const hit = cache.get(path);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
    const value = send(path);
    cache.set(path, { expiresAt: Date.now() + cacheTtlMs, value });
    value.catch(() => cache.delete(path));
    return value;
  };

  return {
    authenticated,

    async getUser(login) {
      try {
        const user = toGitHubUser(await cached(`/users/${encodeURIComponent(login)}`));
        if (!user) throw new UpstreamError(PROVIDER, null, 'GitHub returned an unexpected user payload');
        return user;
      } catch (error) {
        if (error instanceof UpstreamError && error.status === 404) return null;
        throw error;
      }
    },

    async getRepos(login) {
      const payload = await cached(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&type=owner`);
      return Array.isArray(payload)
        ? payload.map(toGitHubRepo).filter((repo): repo is GitHubRepo => repo !== null)
        : [];
    },

    async searchUsers(query, { perPage, sort }) {
      const params = new URLSearchParams({
        q: query,
        per_page: String(perPage),
        ...(sort ? { sort, order: 'desc' } : {}),
      });
      const payload = await cached(`/search/users?${params.toString()}`);
      const items = isRecord(payload) && Array.isArray(payload.items) ? (payload.items as unknown[]) : [];
      return items.flatMap((item) =>
        isRecord(item) && isString(item.login) && item.type !== 'Organization' ? [item.login] : [],
      );
    },

    async rateLimit() {
      const payload = await send('/rate_limit');
      const core = isRecord(payload) && isRecord(payload.resources) ? payload.resources.core : null;
      if (
        !isRecord(core) ||
        !isFiniteNumber(core.limit) ||
        !isFiniteNumber(core.remaining) ||
        !isFiniteNumber(core.reset)
      ) {
        throw new UpstreamError(PROVIDER, null, 'GitHub returned an unexpected rate limit payload');
      }
      return {
        authenticated,
        limit: core.limit,
        remaining: core.remaining,
        resetAt: new Date(core.reset * 1000).toISOString(),
      };
    },
  };
}
