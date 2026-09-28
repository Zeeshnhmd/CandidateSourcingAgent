import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorBody } from '@csa/contracts';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'not_found', `No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const isBodyParseError = error instanceof SyntaxError && 'body' in error;
  const httpError =
    error instanceof HttpError
      ? error
      : isBodyParseError
        ? new HttpError(400, 'invalid_json', 'Request body must be valid JSON')
        : new HttpError(500, 'internal_error', 'Something went wrong. Please try again.');

  if (httpError.status >= 500) console.error(error);

  const body: ApiErrorBody = { error: { code: httpError.code, message: httpError.message } };
  res.status(httpError.status).json(body);
};
