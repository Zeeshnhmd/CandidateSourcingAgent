import { SENIORITY_LEVELS, type Seniority } from '@csa/contracts';

const TITLE_PATTERNS: [RegExp, Seniority][] = [
  [/\b(intern|internship|trainee)\b/i, 'intern'],
  [/\b(principal|distinguished|architect|head of|director|vp)\b/i, 'principal'],
  [/\b(lead|staff|engineering manager)\b/i, 'lead'],
  [/\b(senior|sr\.?)\b/i, 'senior'],
  [/\b(mid|mid-level|intermediate)\b/i, 'mid'],
  [/\b(junior|jr\.?|entry[- ]level|graduate|associate)\b/i, 'junior'],
];

export function seniorityFromTitle(title: string): Seniority | null {
  return TITLE_PATTERNS.find(([pattern]) => pattern.test(title))?.[1] ?? null;
}

export function seniorityFromYears(years: number): Seniority {
  if (years < 2) return 'junior';
  if (years < 5) return 'mid';
  if (years < 9) return 'senior';
  return 'lead';
}

export function seniorityRank(level: Seniority): number {
  return SENIORITY_LEVELS.indexOf(level);
}

/** Typical minimum years for a level, used when the JD does not state experience. */
export const DEFAULT_MIN_YEARS: Record<Seniority, number> = {
  intern: 0,
  junior: 1,
  mid: 3,
  senior: 5,
  lead: 7,
  principal: 10,
};
