import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthSession, DemoUser } from '@csa/contracts';

/** Publicly documented demo credentials. This is demo authentication, not production security. */
export const DEMO_CREDENTIALS = {
  email: 'demo@candidate.local',
  password: 'Demo@123',
} as const;

const DEMO_USER: DemoUser = {
  id: 'demo-user',
  email: DEMO_CREDENTIALS.email,
  name: 'Recruiting Team',
};

interface StoredSession {
  user: DemoUser;
  expiresAt: number;
}

export interface AuthService {
  login(email: string, password: string): AuthSession | null;
  verify(token: string): AuthSession | null;
  logout(token: string): void;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** In-memory session store. Sessions disappear when the API restarts, which is acceptable for the demo. */
export function createAuthService(options: { ttlMs: number; now?: () => number }): AuthService {
  const now = options.now ?? Date.now;
  const sessions = new Map<string, StoredSession>();

  const toSession = (token: string, stored: StoredSession): AuthSession => ({
    token,
    expiresAt: new Date(stored.expiresAt).toISOString(),
    user: stored.user,
  });

  const pruneExpired = () => {
    const current = now();
    for (const [token, session] of sessions) {
      if (session.expiresAt <= current) sessions.delete(token);
    }
  };

  return {
    login(email, password) {
      const emailMatches = email.trim().toLowerCase() === DEMO_CREDENTIALS.email;
      const passwordMatches = safeEqual(password, DEMO_CREDENTIALS.password);
      if (!emailMatches || !passwordMatches) return null;

      pruneExpired();
      const token = randomBytes(32).toString('base64url');
      const stored = { user: DEMO_USER, expiresAt: now() + options.ttlMs };
      sessions.set(token, stored);
      return toSession(token, stored);
    },

    verify(token) {
      const stored = sessions.get(token);
      if (!stored) return null;
      if (stored.expiresAt <= now()) {
        sessions.delete(token);
        return null;
      }
      return toSession(token, stored);
    },

    logout(token) {
      sessions.delete(token);
    },
  };
}
