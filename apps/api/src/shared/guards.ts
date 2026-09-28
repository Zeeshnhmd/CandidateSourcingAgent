/** Narrow runtime guards for untrusted data at HTTP, provider and AI boundaries. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isString) : [];
}

export function asNullableNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}
