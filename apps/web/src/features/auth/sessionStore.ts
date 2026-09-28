import type { AuthSession } from '@csa/contracts';

const STORAGE_KEY = 'csa.demo-session';

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AuthSession>;
  return (
    typeof candidate.token === 'string' &&
    typeof candidate.expiresAt === 'string' &&
    typeof candidate.user?.email === 'string' &&
    typeof candidate.user.name === 'string'
  );
}

/** Reads a non-expired session from `sessionStorage`, so it survives reloads but not closing the tab. */
export function readStoredSession(now: number = Date.now()): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isAuthSession(parsed) && Date.parse(parsed.expiresAt) > now) return parsed;
  } catch {
    // Storage can be unavailable or hold malformed data; treat both as signed out.
  }
  clearStoredSession();
  return null;
}

export function storeSession(session: AuthSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The in-memory session still works for this page view.
  }
}

export function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
