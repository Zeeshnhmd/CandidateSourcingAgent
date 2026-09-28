export const SENIORITY_LEVELS = ['intern', 'junior', 'mid', 'senior', 'lead', 'principal'] as const;
export type Seniority = (typeof SENIORITY_LEVELS)[number];

export const WORK_MODES = ['onsite', 'hybrid', 'remote', 'unspecified'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export type AiProvider = 'openai' | 'fallback';

/** Structured hiring intent extracted from a job description and editable by the recruiter. */
export interface CandidatePersona {
  roleTitle: string;
  seniority: Seniority;
  minYearsExperience: number | null;
  maxYearsExperience: number | null;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  location: string | null;
  workMode: WorkMode;
  /** Drives whether public technical evidence (GitHub) is part of the score. */
  isTechnicalRole: boolean;
  summary: string;
}

export interface JobAnalysisRequest {
  jobDescription: string;
}

export interface JobAnalysisResult {
  persona: CandidatePersona;
  analyzedBy: AiProvider;
  warnings: string[];
}
