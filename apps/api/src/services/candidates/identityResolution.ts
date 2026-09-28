import type { SourceCandidateRecord } from '../../adapters/types';

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

/** Strong identifiers that indicate two records describe the same person. */
function identityKeys(record: SourceCandidateRecord): string[] {
  const keys: string[] = [];
  if (record.email) keys.push(`email:${record.email.trim().toLowerCase()}`);
  if (record.profileUrl) keys.push(`url:${normalizeUrl(record.profileUrl)}`);
  if (record.githubUsername) keys.push(`github:${record.githubUsername.toLowerCase()}`);
  if (record.currentCompany)
    keys.push(`name:${normalizeName(record.fullName)}|${normalizeName(record.currentCompany)}`);
  return keys;
}

export interface IdentityResolution {
  /** Each group is one person. The most recently updated record comes first. */
  groups: SourceCandidateRecord[][];
  duplicatesMerged: number;
}

/** Groups records that share any identity key, transitively (union-find). */
export function resolveIdentities(records: readonly SourceCandidateRecord[]): IdentityResolution {
  const parent = records.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root] ?? root;
    parent[index] = root;
    return root;
  };

  const owners = new Map<string, number>();
  records.forEach((record, index) => {
    for (const key of identityKeys(record)) {
      const owner = owners.get(key);
      if (owner === undefined) owners.set(key, index);
      else parent[find(index)] = find(owner);
    }
  });

  const groups = new Map<number, SourceCandidateRecord[]>();
  records.forEach((record, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), record]);
  });

  const ordered = [...groups.values()].map((group) =>
    [...group].sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.source.externalId.localeCompare(b.source.externalId),
    ),
  );
  return { groups: ordered, duplicatesMerged: records.length - ordered.length };
}
