import type { CandidateLocation } from '@csa/contracts';

const PLACE_ALIASES: Record<string, string> = {
  bangalore: 'bengaluru',
  bombay: 'mumbai',
  gurgaon: 'gurugram',
  madras: 'chennai',
  uae: 'united arab emirates',
  uk: 'united kingdom',
  england: 'united kingdom',
  usa: 'united states',
  us: 'united states',
};

function normalizePlace(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((token) => PLACE_ALIASES[token] ?? token)
    .join(' ');
}

/** Parses "City, Country" style text. A single part is treated as the city. */
export function parseLocation(text: string | null): CandidateLocation {
  const parts = (text ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const city = parts[0] ?? null;
  const country = parts.length > 1 ? (parts.at(-1) ?? null) : null;
  return { city, country, label: parts.length ? parts.join(', ') : 'Location not provided' };
}

type LocationFit = 'same-city' | 'same-country' | 'none';

export function compareLocation(required: string, candidate: CandidateLocation): LocationFit {
  const requiredText = ` ${normalizePlace(required)} `;
  const includes = (value: string | null) => value !== null && requiredText.includes(` ${normalizePlace(value)} `);
  if (includes(candidate.city)) return 'same-city';
  if (includes(candidate.country)) return 'same-country';
  return 'none';
}
