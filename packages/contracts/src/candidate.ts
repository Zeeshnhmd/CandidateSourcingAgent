import type { AiProvider } from './persona';

export type Capability = 'DISCOVER' | 'ENRICH' | 'EVIDENCE' | 'ANALYZE' | 'EMBEDDING';

/** One provider record that contributed to a resolved candidate. */
export interface SourceRecordRef {
  sourceId: string;
  sourceName: string;
  capability: Capability;
  externalId: string;
  retrievedAt: string;
  isMock: boolean;
}

/** Which source supplied a given candidate field. */
export interface FieldProvenance {
  field: string;
  sourceId: string;
  sourceName: string;
  externalId: string;
  retrievedAt: string;
}

export interface CandidateSkill {
  name: string;
  /** External ids of the `sourceRecords` that listed this skill. */
  sourceRecordIds: string[];
}

export interface CandidateExperience {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  summary: string;
  skills: string[];
}

export interface CandidateEducation {
  institution: string;
  degree: string;
  endYear: number | null;
}

export interface CandidateLocation {
  city: string | null;
  country: string | null;
  label: string;
}

export interface CandidateProfile {
  id: string;
  fullName: string;
  headline: string;
  currentTitle: string;
  currentCompany: string | null;
  location: CandidateLocation;
  openToRemote: boolean;
  openToRelocation: boolean;
  totalYearsExperience: number;
  skills: CandidateSkill[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
  certifications: string[];
  summary: string;
  profileUrl: string | null;
  githubUsername: string | null;
  avatarUrl: string | null;
  /**
   * Start of public code activity (oldest owned repository). Used as a clearly labelled
   * experience estimate when a source has no employment history, such as GitHub.
   */
  publicActivitySince: string | null;
  sourceRecords: SourceRecordRef[];
  fieldProvenance: FieldProvenance[];
}

export interface GitHubRepoEvidence {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
  topics: string[];
  url: string | null;
}

export interface GitHubEvidence {
  /** `mock` evidence is synthetic and must be labelled as such in the UI. */
  mode: 'live' | 'mock';
  username: string;
  profileUrl: string | null;
  publicRepos: number;
  followers: number;
  totalStars: number;
  /** Repositories pushed within the last 90 days. */
  recentlyActiveRepos: number;
  topLanguages: { name: string; repoCount: number }[];
  notableRepos: GitHubRepoEvidence[];
  retrievedAt: string;
}

export type EvidenceStatus = 'available' | 'not-found' | 'unavailable' | 'not-applicable';

export interface CandidateEvidence {
  status: EvidenceStatus;
  github: GitHubEvidence | null;
  /** Skills from the persona corroborated by public evidence. */
  corroboratedSkills: string[];
  note: string | null;
}

export const SCORE_COMPONENT_KEYS = [
  'mustHaveSkills',
  'niceToHaveSkills',
  'experience',
  'roleSeniority',
  'semanticRelevance',
  'technicalEvidence',
  'location',
] as const;
export type ScoreComponentKey = (typeof SCORE_COMPONENT_KEYS)[number];

export interface ScoreComponent {
  key: ScoreComponentKey;
  label: string;
  weight: number;
  /** 0 to 1 share of the weight earned. */
  ratio: number;
  points: number;
  /** Non-applicable components are excluded and the total is normalised over the rest. */
  applicable: boolean;
  detail: string;
}

export type MatchTier = 'strong' | 'good' | 'partial' | 'weak';

export interface MatchScore {
  total: number;
  tier: MatchTier;
  components: ScoreComponent[];
  applicableWeight: number;
  policyVersion: string;
}

export interface SkillMatch {
  matchedMustHave: string[];
  missingMustHave: string[];
  matchedNiceToHave: string[];
}

export interface MatchExplanation {
  text: string;
  generatedBy: AiProvider;
}

export interface RankedCandidate {
  rank: number;
  candidate: CandidateProfile;
  evidence: CandidateEvidence;
  score: MatchScore;
  skillMatch: SkillMatch;
  relevantYears: number;
  /** Indexes into `candidate.experience` that counted as relevant. */
  relevantExperienceIndexes: number[];
  explanation: MatchExplanation;
}
