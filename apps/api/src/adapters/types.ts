import type { Capability, CandidateEducation, GitHubEvidence, SourceRecordRef } from '@csa/contracts';
import type { GitHubRateLimit } from './github/githubClient';

export interface ProviderInfo {
  id: string;
  name: string;
  capabilities: readonly Capability[];
  isMock: boolean;
  /** Only useful for technical roles, for example code-hosting platforms. */
  technicalRolesOnly?: boolean;
}

export interface DiscoveryQuery {
  /** Canonical skills and role keywords. A record matching any keyword is returned. */
  keywords: string[];
  /** Preferred candidate location, or `null` for remote roles and roles without a location. */
  location: string | null;
  limit: number;
}

/** Provider-agnostic record produced by discovery adapters, before identity resolution. */
export interface SourceCandidateRecord {
  source: SourceRecordRef;
  fullName: string;
  email: string | null;
  profileUrl: string | null;
  githubUsername: string | null;
  avatarUrl: string | null;
  /** Oldest owned public repository, for sources without employment history. */
  publicActivitySince: string | null;
  headline: string;
  currentTitle: string;
  currentCompany: string | null;
  locationText: string | null;
  openToRemote: boolean;
  openToRelocation: boolean;
  skills: string[];
  experience: {
    title: string;
    company: string;
    startDate: string;
    endDate: string | null;
    summary: string;
    skills: string[];
  }[];
  summary: string;
  updatedAt: string;
}

export interface EnrichmentRecord {
  source: SourceRecordRef;
  /** External id of the discovered record this enrichment belongs to. */
  subjectExternalId: string;
  skills: string[];
  certifications: string[];
  education: CandidateEducation[];
}

export interface DiscoveryAdapter {
  readonly info: ProviderInfo;
  discover(query: DiscoveryQuery): Promise<SourceCandidateRecord[]>;
  /** Resolves when the provider is reachable, rejects otherwise. */
  checkHealth(): Promise<void>;
}

export interface EnrichmentAdapter {
  readonly info: ProviderInfo;
  /** Returns enrichment for the subset of records this provider knows about. */
  enrich(records: readonly SourceRecordRef[]): Promise<EnrichmentRecord[]>;
}

export interface LiveGitHubEvidenceAdapter {
  readonly info: ProviderInfo;
  /** Returns `null` when the user does not exist. Throws `UpstreamError` when GitHub cannot be reached. */
  collect(username: string): Promise<GitHubEvidence | null>;
  /** Current core rate limit. Does not count against the limit. Throws when the token is rejected. */
  checkRateLimit(): Promise<GitHubRateLimit>;
}

export interface MockGitHubEvidenceAdapter {
  readonly info: ProviderInfo;
  /** Returns mock evidence keyed by the discovered record external id. */
  collect(records: readonly SourceRecordRef[]): Promise<Map<string, GitHubEvidence>>;
}
