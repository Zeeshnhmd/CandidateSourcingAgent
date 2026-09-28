import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { createFallbackAiAdapter } from '../../adapters/ai/fallback/fallbackAiAdapter';
import { loadConfig } from '../../config/env';
import { createAiService } from '../../services/ai/aiService';
import type { SourcingService } from '../../services/sourcing/sourcingService';
import { createAuthService, DEMO_CREDENTIALS } from './authService';

function buildApp(now: () => number = Date.now) {
  const fallback = createFallbackAiAdapter();
  const sourcing: SourcingService = {
    start: () => Promise.reject(new Error('not used')),
    get: () => null,
    list: () => [],
    delete: () => false,
  };
  return createApp({
    config: loadConfig({}),
    auth: createAuthService({ ttlMs: 60_000, now }),
    ai: createAiService(fallback, fallback),
    sourcing,
    discovery: [],
    github: {
      info: { id: 'github', name: 'GitHub', capabilities: ['EVIDENCE'], isMock: false },
      collect: () => Promise.resolve(null),
      checkRateLimit: () =>
        Promise.resolve({ authenticated: false, limit: 60, remaining: 60, resetAt: new Date().toISOString() }),
    },
  });
}

describe('demo auth service', () => {
  it('accepts only the documented demo credentials, ignoring email case', () => {
    const auth = createAuthService({ ttlMs: 1000 });
    expect(auth.login('DEMO@candidate.local', DEMO_CREDENTIALS.password)?.user.email).toBe(DEMO_CREDENTIALS.email);
    expect(auth.login(DEMO_CREDENTIALS.email, 'demo@123')).toBeNull();
    expect(auth.login('someone@candidate.local', DEMO_CREDENTIALS.password)).toBeNull();
  });

  it('expires sessions after the TTL', () => {
    let clock = 0;
    const auth = createAuthService({ ttlMs: 1000, now: () => clock });
    const session = auth.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    expect(session && auth.verify(session.token)).toBeTruthy();
    clock = 1000;
    expect(session && auth.verify(session.token)).toBeNull();
  });
});

describe('auth routes', () => {
  it('protects application routes until the user signs in', async () => {
    const app = buildApp();
    const unauthenticated = await request(app).get('/api/system/status');
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('unauthenticated');

    const login = await request(app).post('/api/auth/login').send(DEMO_CREDENTIALS);
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');

    const session = await request(app).get('/api/auth/session').set('Authorization', `Bearer ${login.body.token}`);
    expect(session.status).toBe(200);
    expect(session.body.user.email).toBe(DEMO_CREDENTIALS.email);
  });

  it('rejects wrong credentials and malformed bodies', async () => {
    const app = buildApp();
    const wrong = await request(app).post('/api/auth/login').send({ email: DEMO_CREDENTIALS.email, password: 'wrong' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('invalid_credentials');

    const malformed = await request(app).post('/api/auth/login').send({ email: 42 });
    expect(malformed.status).toBe(400);
  });

  it('invalidates the token on sign out', async () => {
    const app = buildApp();
    const { body } = await request(app).post('/api/auth/login').send(DEMO_CREDENTIALS);
    const auth = `Bearer ${body.token as string}`;

    expect((await request(app).post('/api/auth/logout').set('Authorization', auth)).status).toBe(204);
    expect((await request(app).get('/api/auth/session').set('Authorization', auth)).status).toBe(401);
  });
});
