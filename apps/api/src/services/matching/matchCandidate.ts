import type {
  CandidateEvidence,
  CandidatePersona,
  CandidateProfile,
  MatchScore,
  ScoreComponent,
  ScoreComponentKey,
  SkillMatch,
} from '@csa/contracts';
import { yearsCovered } from '../candidates/experienceDuration';
import { compareLocation } from '../candidates/location';
import { skillKey } from '../skills/skillTaxonomy';
import { compareTitles } from './roleTitle';
import { SCORING_POLICY, tierFor } from './scoringPolicy';
import { DEFAULT_MIN_YEARS, seniorityFromTitle, seniorityFromYears, seniorityRank } from './seniority';

export interface MatchInput {
  persona: CandidatePersona;
  candidate: CandidateProfile;
  evidence: CandidateEvidence;
  /** Calibrated 0 to 1, or `null` when semantic relevance could not be computed. */
  semanticRelevance: number | null;
  now: Date;
}

export interface MatchResult {
  score: MatchScore;
  skillMatch: SkillMatch;
  relevantYears: number;
  relevantExperienceIndexes: number[];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

function component(key: ScoreComponentKey, ratio: number, detail: string, applicable = true): ScoreComponent {
  const weight = SCORING_POLICY.weights[key];
  const earned = applicable ? clamp01(ratio) : 0;
  return {
    key,
    label: SCORING_POLICY.labels[key],
    weight,
    ratio: round(earned, 3),
    points: round(weight * earned, 1),
    applicable,
    detail,
  };
}

function matchSkills(persona: CandidatePersona, candidate: CandidateProfile): SkillMatch {
  const owned = new Set([
    ...candidate.skills.map((skill) => skillKey(skill.name)),
    ...candidate.experience.flatMap((item) => item.skills.map(skillKey)),
  ]);
  const has = (skill: string) => owned.has(skillKey(skill));
  return {
    matchedMustHave: persona.mustHaveSkills.filter(has),
    missingMustHave: persona.mustHaveSkills.filter((skill) => !has(skill)),
    matchedNiceToHave: persona.niceToHaveSkills.filter(has),
  };
}

function skillComponents(persona: CandidatePersona, skills: SkillMatch): ScoreComponent[] {
  const mustTotal = persona.mustHaveSkills.length;
  const niceTotal = persona.niceToHaveSkills.length;
  const missing = skills.missingMustHave.length ? `. Missing ${skills.missingMustHave.join(', ')}` : '';
  return [
    mustTotal
      ? component(
          'mustHaveSkills',
          skills.matchedMustHave.length / mustTotal,
          `${skills.matchedMustHave.length} of ${mustTotal} matched${missing}`,
        )
      : component('mustHaveSkills', 0, 'No must-have skills specified', false),
    niceTotal
      ? component(
          'niceToHaveSkills',
          skills.matchedNiceToHave.length / niceTotal,
          `${skills.matchedNiceToHave.length} of ${niceTotal} matched${skills.matchedNiceToHave.length ? ` (${skills.matchedNiceToHave.join(', ')})` : ''}`,
        )
      : component('niceToHaveSkills', 0, 'No nice-to-have skills specified', false),
  ];
}

function experienceComponent(input: MatchInput): {
  component: ScoreComponent;
  relevantYears: number;
  indexes: number[];
} {
  const { persona, candidate, now } = input;
  const mustKeys = new Set(persona.mustHaveSkills.map(skillKey));
  const indexes = candidate.experience
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        compareTitles(persona.roleTitle, item.title).domainMatch ||
        item.skills.some((skill) => mustKeys.has(skillKey(skill))),
    )
    .map(({ index }) => index);
  const policy = SCORING_POLICY.experience;
  const stated = persona.minYearsExperience;
  const required = stated ?? DEFAULT_MIN_YEARS[persona.seniority];
  const requirement = stated !== null ? `${stated}+ required` : `${required}+ typical for ${persona.seniority}`;

  // Sources such as GitHub have no employment history. Public activity is a weaker, labelled proxy
  // that only counts when the profile shows at least one must-have skill.
  const estimateFromActivity =
    candidate.experience.length === 0 &&
    candidate.publicActivitySince !== null &&
    candidate.skills.some((skill) => mustKeys.has(skillKey(skill.name)));
  const relevantYears = estimateFromActivity
    ? yearsCovered([{ startDate: candidate.publicActivitySince ?? '', endDate: null }], now)
    : yearsCovered(
        indexes.flatMap((index) => candidate.experience[index] ?? []),
        now,
      );

  let ratio =
    required === 0 ? (relevantYears > 0 ? 1 : policy.noRequirementWithoutRelevantRatio) : relevantYears / required;
  let detail = `${relevantYears} relevant years (${requirement})`;
  if (estimateFromActivity) {
    ratio = Math.min(ratio, 1) * policy.publicActivityRatio;
    detail = `Estimated ${relevantYears} years from public GitHub activity since ${candidate.publicActivitySince?.slice(0, 4) ?? ''}, no employment history (${requirement})`;
  }
  const max = persona.maxYearsExperience;
  if (max !== null && relevantYears > max + policy.overqualifiedBufferYears) {
    ratio = Math.min(ratio, 1) * policy.overqualifiedRatio;
    detail += `, above the ${max} year upper range`;
  }
  return { component: component('experience', ratio, detail), relevantYears, indexes };
}

function roleSeniorityComponent(persona: CandidatePersona, candidate: CandidateProfile): ScoreComponent {
  const policy = SCORING_POLICY.roleSeniority;
  const title = Math.max(
    compareTitles(persona.roleTitle, candidate.currentTitle).similarity,
    compareTitles(persona.roleTitle, candidate.headline).similarity,
  );
  const level = seniorityFromTitle(candidate.currentTitle) ?? seniorityFromYears(candidate.totalYearsExperience);
  const distance = Math.min(
    Math.abs(seniorityRank(level) - seniorityRank(persona.seniority)),
    policy.byLevelDistance.length - 1,
  );
  const ratio = policy.titleShare * title + policy.seniorityShare * (policy.byLevelDistance[distance] ?? 0);

  const titleLabel =
    title >= 0.99
      ? 'Title matches'
      : title >= 0.5
        ? 'Title partially matches'
        : title > 0
          ? 'Title loosely related'
          : 'Different title';
  const levelLabel = distance === 0 ? `${level} level matches` : `${level} level vs ${persona.seniority} required`;
  return component('roleSeniority', ratio, `${titleLabel}, ${levelLabel}`);
}

function semanticComponent(relevance: number | null): ScoreComponent {
  if (relevance === null)
    return component('semanticRelevance', 0, 'Semantic relevance unavailable for this run', false);
  const strength = relevance >= 0.75 ? 'Strongly' : relevance >= 0.45 ? 'Moderately' : 'Weakly';
  return component('semanticRelevance', relevance, `${strength} aligned with the role description`);
}

function evidenceComponent(persona: CandidatePersona, evidence: CandidateEvidence): ScoreComponent {
  if (!persona.isTechnicalRole) return component('technicalEvidence', 0, 'Not scored for non-technical roles', false);
  if (evidence.status === 'unavailable') {
    return component('technicalEvidence', 0, `Excluded: ${evidence.note ?? 'evidence could not be retrieved'}`, false);
  }
  const github = evidence.github;
  if (evidence.status !== 'available' || !github)
    return component('technicalEvidence', 0, 'No public GitHub evidence found');

  const policy = SCORING_POLICY.evidence;
  const skillTarget = Math.min(
    policy.skillsForFullCredit,
    Math.max(1, persona.mustHaveSkills.length + persona.niceToHaveSkills.length),
  );
  const skillRatio = clamp01(evidence.corroboratedSkills.length / skillTarget);
  const activityRatio = clamp01(github.recentlyActiveRepos / policy.activeReposForFullCredit);
  const depthRatio = clamp01(Math.log10(1 + github.totalStars) / Math.log10(1 + policy.starsForFullCredit));
  const ratio = policy.skillShare * skillRatio + policy.activityShare * activityRatio + policy.depthShare * depthRatio;

  const prefix = github.mode === 'mock' ? 'Sample GitHub' : 'Live GitHub';
  const skills = evidence.corroboratedSkills.length
    ? `corroborates ${evidence.corroboratedSkills.slice(0, 3).join(', ')}`
    : 'no required skills corroborated';
  return component(
    'technicalEvidence',
    ratio,
    `${prefix} ${skills}; ${github.recentlyActiveRepos} repos active in the last 90 days`,
  );
}

function locationComponent(persona: CandidatePersona, candidate: CandidateProfile): ScoreComponent {
  const policy = SCORING_POLICY.location;
  const where = candidate.location.label;
  if (persona.workMode === 'remote') return component('location', 1, `Remote role, candidate based in ${where}`);
  if (!persona.location) return component('location', 0, 'No location requirement', false);

  const fit = compareLocation(persona.location, candidate.location);
  if (fit === 'same-city') return component('location', policy.sameCity, `Based in ${where}`);
  if (fit === 'same-country') return component('location', policy.sameCountry, `Same country, based in ${where}`);
  if (candidate.openToRelocation)
    return component('location', policy.willingToRelocate, `Open to relocating from ${where}`);
  if (candidate.openToRemote && persona.workMode === 'unspecified') {
    return component('location', policy.openToRemote, `Remote-friendly, based in ${where}`);
  }
  return component('location', 0, `Based in ${where}`);
}

/** Deterministic, explainable match score. AI output only enters through the calibrated semantic relevance. */
export function matchCandidate(input: MatchInput): MatchResult {
  const skillMatch = matchSkills(input.persona, input.candidate);
  const experience = experienceComponent(input);
  const components = [
    ...skillComponents(input.persona, skillMatch),
    experience.component,
    roleSeniorityComponent(input.persona, input.candidate),
    semanticComponent(input.semanticRelevance),
    evidenceComponent(input.persona, input.evidence),
    locationComponent(input.persona, input.candidate),
  ];

  const applicable = components.filter((item) => item.applicable);
  const applicableWeight = applicable.reduce((sum, item) => sum + item.weight, 0);
  const earned = applicable.reduce((sum, item) => sum + item.weight * item.ratio, 0);
  const total = applicableWeight ? Math.round((earned / applicableWeight) * 100) : 0;

  return {
    score: { total, tier: tierFor(total), components, applicableWeight, policyVersion: SCORING_POLICY.version },
    skillMatch,
    relevantYears: experience.relevantYears,
    relevantExperienceIndexes: experience.indexes,
  };
}

interface Rankable {
  candidate: CandidateProfile;
  score: MatchScore;
  skillMatch: SkillMatch;
  relevantYears: number;
}

/** Sorts by score with stable, explainable tie-breakers and assigns 1-based ranks. */
export function rankCandidates<T extends Rankable>(items: readonly T[]): (T & { rank: number })[] {
  return [...items]
    .sort(
      (a, b) =>
        b.score.total - a.score.total ||
        b.skillMatch.matchedMustHave.length - a.skillMatch.matchedMustHave.length ||
        b.relevantYears - a.relevantYears ||
        a.candidate.fullName.localeCompare(b.candidate.fullName) ||
        a.candidate.id.localeCompare(b.candidate.id),
    )
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
