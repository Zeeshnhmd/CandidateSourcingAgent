import { SENIORITY_LEVELS, WORK_MODES, type CandidatePersona, type Seniority, type WorkMode } from '@csa/contracts';
import { asNullableNumber, asStringArray, isRecord, isString } from '../../shared/guards';
import { canonicalSkills, isTechnicalSkill, skillKey } from '../skills/skillTaxonomy';

const MAX_SKILLS = 12;
const TECHNICAL_TITLE = /\b(engineer|developer|programmer|scientist|devops|sre|architect|data|ml|qa|sdet)\b/i;
const NON_TECHNICAL_TITLE =
  /\b(designer|product manager|product owner|recruiter|marketing|sales|account|people partner)\b/i;

const isSeniority = (value: unknown): value is Seniority =>
  isString(value) && (SENIORITY_LEVELS as readonly string[]).includes(value);

const isWorkMode = (value: unknown): value is WorkMode =>
  isString(value) && (WORK_MODES as readonly string[]).includes(value);

function clampYears(value: number | null): number | null {
  if (value === null) return null;
  return Math.min(40, Math.max(0, Math.round(value)));
}

function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/**
 * Normalises a persona from any origin (AI, heuristic parser or recruiter edits):
 * canonical skills, no overlap between must-have and nice-to-have, sane experience bounds.
 */
export function normalizePersona(persona: CandidatePersona): CandidatePersona {
  const mustHaveSkills = canonicalSkills(persona.mustHaveSkills).slice(0, MAX_SKILLS);
  const mustKeys = new Set(mustHaveSkills.map(skillKey));
  const niceToHaveSkills = canonicalSkills(persona.niceToHaveSkills)
    .filter((skill) => !mustKeys.has(skillKey(skill)))
    .slice(0, MAX_SKILLS);

  const minYears = clampYears(persona.minYearsExperience);
  let maxYears = clampYears(persona.maxYearsExperience);
  if (minYears !== null && maxYears !== null && maxYears < minYears) maxYears = null;

  const roleTitle = cleanText(persona.roleTitle, 120) || 'Unspecified role';
  const location = persona.location ? cleanText(persona.location, 120) || null : null;

  return {
    roleTitle,
    seniority: persona.seniority,
    minYearsExperience: minYears,
    maxYearsExperience: maxYears,
    mustHaveSkills,
    niceToHaveSkills,
    location,
    workMode: persona.workMode,
    isTechnicalRole: persona.isTechnicalRole,
    summary: cleanText(persona.summary, 600),
  };
}

/** Technical by title first, otherwise when most required skills are technical. */
export function inferTechnicalRole(roleTitle: string, skills: readonly string[]): boolean {
  if (TECHNICAL_TITLE.test(roleTitle)) return true;
  if (NON_TECHNICAL_TITLE.test(roleTitle) || !skills.length) return false;
  return skills.filter(isTechnicalSkill).length / skills.length >= 0.5;
}

/**
 * Reads a persona from untrusted input such as a request body or an AI response.
 * Missing optional fields get safe defaults. Returns `null` when the shape is unusable.
 */
export function parsePersona(value: unknown): CandidatePersona | null {
  if (!isRecord(value) || !isString(value.roleTitle)) return null;
  const mustHaveSkills = asStringArray(value.mustHaveSkills);
  const niceToHaveSkills = asStringArray(value.niceToHaveSkills);

  return normalizePersona({
    roleTitle: value.roleTitle,
    seniority: isSeniority(value.seniority) ? value.seniority : 'mid',
    minYearsExperience: asNullableNumber(value.minYearsExperience),
    maxYearsExperience: asNullableNumber(value.maxYearsExperience),
    mustHaveSkills,
    niceToHaveSkills,
    location: isString(value.location) ? value.location : null,
    workMode: isWorkMode(value.workMode) ? value.workMode : 'unspecified',
    isTechnicalRole:
      typeof value.isTechnicalRole === 'boolean'
        ? value.isTechnicalRole
        : inferTechnicalRole(value.roleTitle, [...mustHaveSkills, ...niceToHaveSkills]),
    summary: isString(value.summary) ? value.summary : '',
  });
}

/** Text used for semantic comparison against candidate profiles. */
export function personaToText(persona: CandidatePersona): string {
  return [
    `${persona.seniority} ${persona.roleTitle}`,
    persona.summary,
    `Must have: ${persona.mustHaveSkills.join(', ')}`,
    persona.niceToHaveSkills.length ? `Nice to have: ${persona.niceToHaveSkills.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
