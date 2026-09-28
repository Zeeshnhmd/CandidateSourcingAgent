import type { RequestHandler } from 'express';
import { HttpError } from '../../shared/httpError';
import type { AuthService } from './authService';

export function readBearerToken(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function requireAuth(auth: AuthService): RequestHandler {
  return (req, res, next) => {
    const token = readBearerToken(req.headers.authorization);
    const session = token ? auth.verify(token) : null;
    if (!session) {
      next(new HttpError(401, 'unauthenticated', 'Your session has expired. Please sign in again.'));
      return;
    }
    res.locals.session = session;
    next();
  };
}
