import { isFiniteNumber, isNullableString, isRecord, isString, isStringArray } from '../../../shared/guards';

/** Provider-specific shapes served by JSON Server. They never leave the adapter. */
export interface MockTalentPosition {
  title: string;
  company: string;
  from: string;
  to: string | null;
  description: string;
  tech: string[];
}

export interface MockTalentProfile {
  id: string;
  full_name: string;
  email: string | null;
  headline: string;
  current_title: string;
  current_company: string | null;
  location: string | null;
  remote_ok: boolean;
  relocation_ok: boolean;
  skills: string[];
  positions: MockTalentPosition[];
  summary: string;
  profile_url: string | null;
  github: string | null;
  updated_at: string;
}

export interface MockTalentEnrichment {
  id: string;
  profile_id: string;
  retrieved_at: string;
  skills: string[];
  certifications: string[];
  education: { school: string; degree: string; year: number | null }[];
}

export interface MockGitHubEvidenceRecord {
  id: string;
  profile_id: string;
  login: string;
  public_repos: number;
  followers: number;
  recently_active_repos: number;
  languages: { name: string; repo_count: number }[];
  repos: {
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    pushed_at: string;
    topics: string[];
  }[];
  retrieved_at: string;
}

function isPosition(value: unknown): value is MockTalentPosition {
  return (
    isRecord(value) &&
    isString(value.title) &&
    isString(value.company) &&
    isString(value.from) &&
    isNullableString(value.to) &&
    isString(value.description) &&
    isStringArray(value.tech)
  );
}

export function isMockTalentProfile(value: unknown): value is MockTalentProfile {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.full_name) &&
    isNullableString(value.email) &&
    isString(value.headline) &&
    isString(value.current_title) &&
    isNullableString(value.current_company) &&
    isNullableString(value.location) &&
    typeof value.remote_ok === 'boolean' &&
    typeof value.relocation_ok === 'boolean' &&
    isStringArray(value.skills) &&
    Array.isArray(value.positions) &&
    value.positions.every(isPosition) &&
    isString(value.summary) &&
    isNullableString(value.profile_url) &&
    isNullableString(value.github) &&
    isString(value.updated_at)
  );
}

export function isMockTalentEnrichment(value: unknown): value is MockTalentEnrichment {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.profile_id) &&
    isString(value.retrieved_at) &&
    isStringArray(value.skills) &&
    isStringArray(value.certifications) &&
    Array.isArray(value.education) &&
    value.education.every(
      (item) =>
        isRecord(item) &&
        isString(item.school) &&
        isString(item.degree) &&
        (item.year === null || isFiniteNumber(item.year)),
    )
  );
}

export function isMockGitHubEvidenceRecord(value: unknown): value is MockGitHubEvidenceRecord {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.profile_id) &&
    isString(value.login) &&
    isFiniteNumber(value.public_repos) &&
    isFiniteNumber(value.followers) &&
    isFiniteNumber(value.recently_active_repos) &&
    Array.isArray(value.languages) &&
    value.languages.every((item) => isRecord(item) && isString(item.name) && isFiniteNumber(item.repo_count)) &&
    Array.isArray(value.repos) &&
    value.repos.every(
      (repo) =>
        isRecord(repo) &&
        isString(repo.name) &&
        isNullableString(repo.description) &&
        isNullableString(repo.language) &&
        isFiniteNumber(repo.stars) &&
        isString(repo.pushed_at) &&
        isStringArray(repo.topics),
    ) &&
    isString(value.retrieved_at)
  );
}
