import type { CandidatePersona, MatchScore, ScoreComponentKey, SkillMatch } from '@csa/contracts';

/** Facts an explanation may use. Explanations never change or restate a different score. */
export interface MatchExplanationInput {
  candidateId: string;
  fullName: string;
  currentTitle: string;
  score: MatchScore;
  skillMatch: SkillMatch;
}

const detailOf = (score: MatchScore, key: ScoreComponentKey) =>
  score.components.find((item) => item.key === key && item.applicable);

const list = (items: string[]) =>
  items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items.at(-1) ?? ''}`;

/** Deterministic explanation composed from the score breakdown. */
export function buildTemplateExplanation(input: MatchExplanationInput, persona: CandidatePersona): string {
  const { score, skillMatch } = input;
  const sentences: string[] = [];

  const mustTotal = persona.mustHaveSkills.length;
  const experience = detailOf(score, 'experience');
  const matched = skillMatch.matchedMustHave;
  const matchedPreview = matched.length > 3 ? `including ${list(matched.slice(0, 3))}` : list(matched);
  const opening = mustTotal
    ? `${input.currentTitle} covering ${matched.length} of ${mustTotal} must-have skills${matched.length ? ` (${matchedPreview})` : ''}`
    : input.currentTitle;
  sentences.push(`${opening}${experience ? ` with ${experience.detail}` : ''}.`);

  const evidence = detailOf(score, 'technicalEvidence');
  if (skillMatch.missingMustHave.length) {
    sentences.push(`Gaps: ${list(skillMatch.missingMustHave.slice(0, 3))}.`);
  } else if (evidence && evidence.ratio >= 0.5) {
    sentences.push(`${evidence.detail.charAt(0).toUpperCase()}${evidence.detail.slice(1)}.`);
  }
  return sentences.join(' ');
}
