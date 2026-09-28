const REPLACEMENTS: [RegExp, string][] = [
  [/front[\s-]?end/g, 'frontend'],
  [/back[\s-]?end/g, 'backend'],
  [/full[\s-]?stack/g, 'fullstack'],
  [/site reliability/g, 'sre'],
  [/machine learning/g, 'ml'],
  [/quality assurance/g, 'qa'],
  [/\bui\b/g, 'frontend'],
  [/\b(?:developers?|devs?|engineers|programmers?)\b/g, 'engineer'],
];

const IGNORED = new Set(
  'senior sr junior jr lead staff principal intern mid level head of and the i ii iii iv a an for with to in at remote'.split(
    ' ',
  ),
);
const GENERIC = new Set(['engineer', 'software', 'manager', 'specialist', 'consultant', 'professional']);
const GENERIC_WEIGHT = 0.5;

/** Role-bearing tokens of a job title, excluding seniority words. */
function titleTokens(title: string): string[] {
  let normalized = title.toLowerCase();
  for (const [pattern, replacement] of REPLACEMENTS) normalized = normalized.replace(pattern, replacement);
  return [...new Set(normalized.split(/[^a-z0-9+#]+/).filter((token) => token.length > 1 && !IGNORED.has(token)))];
}

/** Tokens that describe the discipline, such as "frontend" or "data", rather than generic words like "engineer". */
export function domainTokens(title: string): string[] {
  return titleTokens(title).filter((token) => !GENERIC.has(token));
}

export interface TitleMatch {
  /** Weighted share of the role title tokens found in the candidate title, 0 to 1. */
  similarity: number;
  /** True when a discipline token matches, or the role title has none and the match is strong. */
  domainMatch: boolean;
}

export function compareTitles(roleTitle: string, candidateTitle: string): TitleMatch {
  const role = titleTokens(roleTitle);
  if (!role.length) return { similarity: 0, domainMatch: false };

  const candidate = new Set(titleTokens(candidateTitle));
  const weight = (token: string) => (GENERIC.has(token) ? GENERIC_WEIGHT : 1);
  const total = role.reduce((sum, token) => sum + weight(token), 0);
  const matched = role.filter((token) => candidate.has(token));
  const similarity = matched.reduce((sum, token) => sum + weight(token), 0) / total;

  const roleDomain = role.filter((token) => !GENERIC.has(token));
  const domainMatch = roleDomain.length ? matched.some((token) => !GENERIC.has(token)) : similarity >= 0.5;
  return { similarity, domainMatch };
}
