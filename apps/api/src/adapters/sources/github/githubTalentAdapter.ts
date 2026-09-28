import {
  canonicalSkill,
  canonicalSkills,
  findSkillsInText,
  isKnownSkill,
} from '../../../services/skills/skillTaxonomy';
import type { GitHubClient, GitHubRepo, GitHubUser } from '../../github/githubClient';
import type { DiscoveryAdapter, DiscoveryQuery, ProviderInfo, SourceCandidateRecord } from '../../types';

const GITHUB_TALENT_INFO: ProviderInfo = {
  id: 'github',
  name: 'GitHub',
  capabilities: ['DISCOVER'],
  isMock: false,
  technicalRolesOnly: true,
};

/** Canonical skills that are GitHub repository languages, mapped to GitHub's language names. */
const LANGUAGE_FOR_SKILL: Record<string, string> = {
  TypeScript: 'TypeScript',
  JavaScript: 'JavaScript',
  Python: 'Python',
  Java: 'Java',
  Go: 'Go',
  Kotlin: 'Kotlin',
  Swift: 'Swift',
  Dart: 'Dart',
  Rust: 'Rust',
  'C#': 'C#',
  'C++': 'C++',
  Ruby: 'Ruby',
  PHP: 'PHP',
  Scala: 'Scala',
  'Objective-C': 'Objective-C',
  'Vue.js': 'Vue',
  Terraform: 'HCL',
};

/** Frameworks and tools whose projects are usually written in a given language. */
const IMPLIED_LANGUAGE: Record<string, string> = {
  React: 'TypeScript',
  'Next.js': 'TypeScript',
  Angular: 'TypeScript',
  'Node.js': 'TypeScript',
  NestJS: 'TypeScript',
  Express: 'JavaScript',
  'React Native': 'TypeScript',
  Django: 'Python',
  FastAPI: 'Python',
  Flask: 'Python',
  PyTorch: 'Python',
  TensorFlow: 'Python',
  'Machine Learning': 'Python',
  Pandas: 'Python',
  Airflow: 'Python',
  'Spring Boot': 'Java',
  'Ruby on Rails': 'Ruby',
  '.NET': 'C#',
  Flutter: 'Dart',
  SwiftUI: 'Swift',
  iOS: 'Swift',
  Android: 'Kotlin',
  Kubernetes: 'Go',
};

const PLACE_ALIASES: Record<string, string[]> = {
  bengaluru: ['Bangalore'],
  bangalore: ['Bengaluru'],
  mumbai: ['Bombay'],
  gurugram: ['Gurgaon'],
};

const BASE_QUALIFIERS = 'type:user repos:>=5 followers:>=15';
const MAX_SEARCHES = 3;
const PROFILE_CONCURRENCY = 10;
const ROLE_IN_BIO =
  /((?:(?:senior|staff|lead|principal|junior|sr\.?)\s+)?(?:[a-z+#.-]+\s+){0,3}(?:engineer|developer|architect|scientist|programmer|designer))/i;
/** Repository languages that describe markup or tooling rather than a developer's main language. */
const NON_PRIMARY_LANGUAGES = new Set([
  'HTML',
  'CSS',
  'SCSS',
  'Shell',
  'Dockerfile',
  'Makefile',
  'Jupyter Notebook',
  'MDX',
]);

export function primaryLanguage(keywords: readonly string[]): string | null {
  for (const keyword of keywords) {
    const language = LANGUAGE_FOR_SKILL[keyword];
    if (language) return language;
  }
  for (const keyword of keywords) {
    const language = IMPLIED_LANGUAGE[keyword];
    if (language) return language;
  }
  return null;
}

/** Location terms to try in order, from most to least specific. */
export function locationTerms(location: string | null): (string | null)[] {
  if (!location) return [null];
  const parts = location
    .split(',')
    .map((part) => part.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);
  const city = parts[0];
  const country = parts.length > 1 ? parts.at(-1) : undefined;
  const terms = [city, ...(city ? (PLACE_ALIASES[city.toLowerCase()] ?? []) : []), country].filter(
    (term): term is string => Boolean(term),
  );
  return [...new Set(terms), null];
}

/** Builds a GitHub user search query. Multi-word locations are quoted as GitHub requires. */
export function buildUserSearchQuery(language: string, location: string | null): string {
  const place = location ? ` location:${/\s/.test(location) ? `"${location}"` : location}` : '';
  return `language:${/\s/.test(language) ? `"${language}"` : language}${place} ${BASE_QUALIFIERS}`;
}

function deriveTitle(bio: string | null, languages: readonly string[]): string {
  const match = bio?.match(ROLE_IN_BIO)?.[1]?.trim();
  const title = match?.replace(
    /^(?:(?:experienced|passionate|aspiring|enthusiastic|self-taught|curious|a|an)\s+)+/i,
    '',
  );
  if (title?.includes(' ')) return title.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const mainLanguage = languages.find((language) => !NON_PRIMARY_LANGUAGES.has(language));
  return `${mainLanguage ?? 'Software'} Developer`;
}

/** Maps a GitHub profile and its public repositories to a provider-agnostic candidate record. */
export function toGitHubCandidateRecord(
  user: GitHubUser,
  repos: GitHubRepo[],
  retrievedAt: string,
): SourceCandidateRecord {
  const owned = repos.filter((repo) => !repo.fork);
  const languageCounts = new Map<string, number>();
  for (const repo of owned)
    if (repo.language) languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  const languages = [...languageCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);

  const skills = canonicalSkills([
    ...languages.slice(0, 6).map(canonicalSkill),
    ...owned.flatMap((repo) => repo.topics).filter(isKnownSkill),
    ...findSkillsInText(user.bio ?? ''),
  ]);
  const createdDates = owned
    .map((repo) => repo.created_at)
    .filter((date): date is string => date !== null)
    .sort();
  const title = deriveTitle(user.bio, languages);

  return {
    source: {
      sourceId: GITHUB_TALENT_INFO.id,
      sourceName: GITHUB_TALENT_INFO.name,
      capability: 'DISCOVER',
      externalId: `gh:${user.login.toLowerCase()}`,
      retrievedAt,
      isMock: false,
    },
    fullName: user.name ?? user.login,
    email: null,
    profileUrl: user.html_url,
    githubUsername: user.login,
    avatarUrl: user.avatar_url,
    publicActivitySince: createdDates[0] ?? null,
    headline: user.bio ?? title,
    currentTitle: title,
    currentCompany: user.company?.replace(/^@/, '').trim() || null,
    locationText: user.location,
    openToRemote: false,
    openToRelocation: false,
    skills,
    experience: [],
    summary:
      user.bio ?? `Public GitHub profile with ${user.public_repos} repositories and ${user.followers} followers.`,
    updatedAt: user.updated_at ?? retrievedAt,
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    results.push(...(await Promise.all(items.slice(index, index + limit).map(task))));
  }
  return results;
}

/**
 * Discovers real public developers through GitHub user search. The persona's primary language
 * and location become search qualifiers; location is widened step by step when results are thin.
 */
export function createGitHubTalentAdapter(options: {
  client: GitHubClient;
  maxCandidates?: number;
  now?: () => Date;
}): DiscoveryAdapter {
  const maxCandidates = options.maxCandidates ?? 10;
  const now = options.now ?? (() => new Date());
  const { client } = options;

  return {
    info: GITHUB_TALENT_INFO,

    async checkHealth() {
      await client.rateLimit();
    },

    async discover(query: DiscoveryQuery) {
      const language = primaryLanguage(query.keywords);
      if (!language) return [];

      const logins: string[] = [];
      for (const term of locationTerms(query.location).slice(0, MAX_SEARCHES)) {
        const found = await client.searchUsers(buildUserSearchQuery(language, term), {
          perPage: maxCandidates,
          sort: 'followers',
        });
        for (const login of found) if (!logins.includes(login)) logins.push(login);
        if (logins.length >= maxCandidates) break;
      }

      const retrievedAt = now().toISOString();
      const records = await mapWithConcurrency(logins.slice(0, maxCandidates), PROFILE_CONCURRENCY, async (login) => {
        const [user, repos] = await Promise.all([client.getUser(login), client.getRepos(login)]);
        return user ? toGitHubCandidateRecord(user, repos, retrievedAt) : null;
      });
      return records.filter((record): record is SourceCandidateRecord => record !== null);
    },
  };
}
