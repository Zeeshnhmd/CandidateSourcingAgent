import { Router } from 'express';
import type { AuthSession } from '@csa/contracts';
import { isRecord, isString } from '../../shared/guards';
import { HttpError } from '../../shared/httpError';
import type { AuthService } from './authService';
import { readBearerToken, requireAuth } from './requireAuth';

export function createAuthRouter(auth: AuthService): Router {
  const router = Router();

  router.post('/login', (req, res) => {
    const body: unknown = req.body;
    if (!isRecord(body) || !isString(body.email) || !isString(body.password)) {
      throw new HttpError(400, 'invalid_request', 'Email and password are required');
    }
    const session = auth.login(body.email, body.password);
    if (!session) {
      throw new HttpError(401, 'invalid_credentials', 'Incorrect email or password');
    }
    res.json(session satisfies AuthSession);
  });

  router.get('/session', requireAuth(auth), (_req, res) => {
    res.json(res.locals.session as AuthSession);
  });

  router.post('/logout', (req, res) => {
    const token = readBearerToken(req.headers.authorization);
    if (token) auth.logout(token);
    res.status(204).end();
  });

  return router;
}
