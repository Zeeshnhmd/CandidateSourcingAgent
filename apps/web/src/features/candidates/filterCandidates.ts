import type { MatchTier, RankedCandidate } from '@csa/contracts';

export type MinimumTier = 'all' | Exclude<MatchTier, 'weak'>;

export interface CandidateFilterState {
  search: string;
  minimumTier: MinimumTier;
  /** Candidate must have every selected skill. */
  requiredSkills: string[];
  /** `remote`, or `country:<name>`. */
  location: string | null;
  /** Discovery source name, for example `GitHub`. */
  source: string | null;
  evidenceOnly: boolean;
}

export const DEFAULT_FILTERS: CandidateFilterState = {
  search: '',
  minimumTier: 'all',
  requiredSkills: [],
  location: null,
  source: null,
  evidenceOnly: false,
};

const REMOTE_LOCATION = 'remote';

const TIER_ORDER: Record<MatchTier, number> = { weak: 0, partial: 1, good: 2, strong: 3 };

const lower = (value: string) => value.toLowerCase();

function matchesSearch(item: RankedCandidate, search: string): boolean {
  if (!search) return true;
  const { candidate } = item;
  const haystack = [candidate.fullName, candidate.currentTitle, candidate.currentCompany ?? '', candidate.headline]
    .concat(candidate.skills.map((skill) => skill.name))
    .map(lower);
  return haystack.some((value) => value.includes(search));
}

function matchesLocation(item: RankedCandidate, location: string | null): boolean {
  if (!location) return true;
  if (location === REMOTE_LOCATION) return item.candidate.openToRemote;
  return item.candidate.location.country === location.replace(/^country:/, '');
}

export function filterCandidates(
  candidates: readonly RankedCandidate[],
  filters: CandidateFilterState,
): RankedCandidate[] {
  const search = lower(filters.search.trim());
  const required = filters.requiredSkills.map(lower);

  return candidates.filter((item) => {
    if (filters.minimumTier !== 'all' && TIER_ORDER[item.score.tier] < TIER_ORDER[filters.minimumTier]) return false;
    if (filters.evidenceOnly && item.evidence.status !== 'available') return false;
    if (!matchesLocation(item, filters.location)) return false;
    if (filters.source && !discoverySources(item).includes(filters.source)) return false;
    if (required.length) {
      const owned = new Set(item.candidate.skills.map((skill) => lower(skill.name)));
      if (!required.every((skill) => owned.has(skill))) return false;
    }
    return matchesSearch(item, search);
  });
}

export function discoverySources(item: RankedCandidate): string[] {
  return [
    ...new Set(
      item.candidate.sourceRecords
        .filter((record) => record.capability === 'DISCOVER')
        .map((record) => record.sourceName),
    ),
  ];
}

export function sourceOptions(candidates: readonly RankedCandidate[]): string[] {
  return [...new Set(candidates.flatMap(discoverySources))].sort();
}

export function locationOptions(candidates: readonly RankedCandidate[]): { value: string; label: string }[] {
  const countries = [
    ...new Set(candidates.map((item) => item.candidate.location.country).filter((country) => country !== null)),
  ];
  return [
    { value: REMOTE_LOCATION, label: 'Open to remote' },
    ...countries.sort().map((country) => ({ value: `country:${country}`, label: country })),
  ];
}

export function hasActiveFilters(filters: CandidateFilterState): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.minimumTier !== 'all' ||
    filters.requiredSkills.length > 0 ||
    filters.location !== null ||
    filters.source !== null ||
    filters.evidenceOnly
  );
}
