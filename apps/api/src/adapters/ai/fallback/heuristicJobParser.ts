import type { CandidatePersona, WorkMode } from '@csa/contracts';
import { inferTechnicalRole, normalizePersona } from '../../../services/job-analysis/persona';
import { seniorityFromTitle, seniorityFromYears } from '../../../services/matching/seniority';
import { findSkillsInText, skillKey } from '../../../services/skills/skillTaxonomy';

type Section = 'must' | 'nice' | 'context' | 'neutral';

const ROLE_NOUN =
  '(?:Engineer|Developer|Designer|Manager|Scientist|Analyst|Architect|Lead|Specialist|Consultant|Recruiter|Administrator|SRE)';
const LABELED_TITLE = /^(?:job\s+title|title|role|position)\s*[:|-]\s*(.{3,100})$/i;
const HIRING_PHRASE = new RegExp(
  `(?:[Hh]iring|[Ll]ooking for|[Ss]eeking|[Ss]earching for)\\s+(?:an?\\s+|our\\s+(?:next\\s+|first\\s+)?)?((?:[A-Z][\\w+#./-]*\\s+){0,5}${ROLE_NOUN}s?)`,
);
const TITLE_ANYWHERE = new RegExp(`((?:(?:[A-Z][\\w+#./-]*|of|and)\\s+){0,4}${ROLE_NOUN})`);
const LABELED_LOCATION = /^(?:location|work\s+location|office|based\s+in)\s*[:|-]\s*(.{2,100})$/im;
const LOCATION_PHRASE =
  /\b(?:[Bb]ased in|[Ll]ocated in|[Oo]ffices? in|[Rr]elocate to)\s+([A-Z][\p{L}]+(?:[ ,]+[A-Z][\p{L}]+){0,2})/u;
const YEARS =
  /(?:at least|minimum(?: of)?|over)?\s*(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*(\d{1,2}))?\s*\+?\s*(?:years?|yrs?)\b/i;

const NICE_LINE =
  /nice[\s-]to[\s-]have|bonus|preferred|a plus|is a plus|good to have|desirable|familiarity with|exposure to|ideally/i;
const NICE_HEADING = /nice[\s-]to[\s-]have|bonus|preferred|good to have|desirable|plus(?:es)?\b|would be great/i;
const MUST_HEADING =
  /requirement|must[\s-]have|required|qualification|what you(?:'ll)? (?:need|bring)|you (?:have|bring)|skills|essential|tech stack|experience|about you/i;
const CONTEXT_HEADING =
  /about (?:us|the company)|who we are|benefit|perks|what we offer|why join|compensation|equal opportunit/i;
const DUTIES_HEADING = /responsibilit|what you(?:'ll| will)? do|the role|your impact|day to day/i;
const WORK_MODE_WORDS = /\(?\b(?:fully\s+)?(?:remote|hybrid|on[- ]?site|in[- ]office)\b\)?/gi;

function detectHeading(line: string): Section | null {
  const stripped = line
    .replace(/^#+\s*/, '')
    .replace(/[*_]/g, '')
    .trim();
  const looksLikeHeading =
    line.startsWith('#') || /:$/.test(stripped) || (stripped.length <= 40 && !/[.,;]$/.test(stripped));
  if (!looksLikeHeading || stripped.length > 60) return null;
  if (NICE_HEADING.test(stripped)) return 'nice';
  if (CONTEXT_HEADING.test(stripped)) return 'context';
  if (DUTIES_HEADING.test(stripped)) return 'neutral';
  if (MUST_HEADING.test(stripped)) return 'must';
  return line.startsWith('#') || /:$/.test(stripped) ? 'neutral' : null;
}

function extractRoleTitle(lines: string[], text: string): string {
  for (const line of lines) {
    const labeled = line.match(LABELED_TITLE);
    if (labeled?.[1]) return labeled[1].trim();
  }
  const hiring = text.match(HIRING_PHRASE)?.[1];
  if (hiring) return hiring.trim();

  const firstLine = lines[0]?.replace(/^#+\s*/, '').replace(/^job description\s*[:|-]\s*/i, '') ?? '';
  if (firstLine.length <= 80 && new RegExp(ROLE_NOUN, 'i').test(firstLine)) {
    return firstLine.split(/\s+(?:[-|@]|at)\s+/)[0]?.trim() ?? firstLine;
  }
  return text.match(TITLE_ANYWHERE)?.[1]?.trim() ?? 'Unspecified role';
}

function extractWorkMode(text: string): WorkMode {
  if (/\bhybrid\b/i.test(text)) return 'hybrid';
  if (/\b(?:fully remote|100% remote|remote[- ]first|remote)\b/i.test(text)) return 'remote';
  if (/\b(?:on[- ]?site|in[- ]office|office[- ]based)\b/i.test(text)) return 'onsite';
  return 'unspecified';
}

function extractLocation(text: string): string | null {
  const raw = text.match(LABELED_LOCATION)?.[1] ?? text.match(LOCATION_PHRASE)?.[1] ?? null;
  const cleaned = raw
    ?.replace(WORK_MODE_WORDS, '')
    .replace(/\s*[/|,-]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned && cleaned.length > 1 ? cleaned : null;
}

/**
 * Skills under requirement headings are must-haves. Skills mentioned elsewhere, such as in
 * responsibilities, only become must-haves when the JD has no explicit requirements section.
 */
function extractSkills(lines: string[]): { must: string[]; nice: string[] } {
  const buckets: Record<Exclude<Section, 'context'>, string[]> = { must: [], nice: [], neutral: [] };
  let section: Section = 'neutral';

  for (const line of lines) {
    const heading = findSkillsInText(line).length ? null : detectHeading(line);
    if (heading) {
      section = heading;
      continue;
    }
    if (section === 'context') continue;
    for (const sentence of line.split(/(?<=[.!?;])\s+/)) {
      buckets[section === 'nice' || NICE_LINE.test(sentence) ? 'nice' : section].push(...findSkillsInText(sentence));
    }
  }

  const hasRequirements = buckets.must.length > 0;
  const must = hasRequirements ? buckets.must : buckets.neutral;
  const mustKeys = new Set(must.map(skillKey));
  const nice = [...buckets.nice, ...(hasRequirements ? buckets.neutral : [])];
  return { must, nice: nice.filter((skill) => !mustKeys.has(skillKey(skill))) };
}

function buildSummary(persona: Omit<CandidatePersona, 'summary'>): string {
  const experience =
    persona.minYearsExperience !== null ? ` with ${persona.minYearsExperience}+ years of experience` : '';
  const skills = persona.mustHaveSkills.length ? `, strong in ${persona.mustHaveSkills.slice(0, 4).join(', ')}` : '';
  const place = persona.workMode === 'remote' ? ' Remote.' : persona.location ? ` Based in ${persona.location}.` : '';
  const level = seniorityFromTitle(persona.roleTitle)
    ? ''
    : `${persona.seniority.charAt(0).toUpperCase()}${persona.seniority.slice(1)} `;
  return `${level}${persona.roleTitle}${experience}${skills}.${place}`;
}

/** Deterministic rule-based JD extraction used when no AI provider is configured or it fails. */
export function parseJobDescription(jobDescription: string): CandidatePersona {
  const text = jobDescription.replace(/\r/g, '');
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^[\s>*•·-]+/, '').trim())
    .filter(Boolean);

  const roleTitle = extractRoleTitle(lines, text);
  const years = text.match(YEARS);
  const minYears = years?.[1] ? Number(years[1]) : null;
  const maxYears = years?.[2] ? Number(years[2]) : null;
  const { must, nice } = extractSkills(lines);
  const workMode = extractWorkMode(text);
  const location = extractLocation(text);

  const draft = {
    roleTitle,
    seniority: seniorityFromTitle(roleTitle) ?? (minYears !== null ? seniorityFromYears(minYears) : 'mid'),
    minYearsExperience: minYears,
    maxYearsExperience: maxYears,
    mustHaveSkills: must,
    niceToHaveSkills: nice,
    location: location && !/^remote$/i.test(location) ? location : null,
    workMode,
    isTechnicalRole: inferTechnicalRole(roleTitle, [...must, ...nice]),
  };
  const normalized = normalizePersona({ ...draft, summary: '' });
  return { ...normalized, summary: buildSummary(normalized) };
}
