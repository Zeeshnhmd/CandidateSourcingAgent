import type { ApiErrorBody } from '@csa/contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string';
}

/** Calls the API and turns network and HTTP failures into `ApiError` with a user-facing message. */
export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', 'Cannot reach the API. Check that it is running and try again.');
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isApiErrorBody(payload) ? payload.error.message : `Request failed with status ${response.status}`;
    const code = isApiErrorBody(payload) && 'code' in payload.error ? payload.error.code : 'http_error';
    throw new ApiError(response.status, code, message);
  }
  return payload as T;
}

export interface ApiClient {
  get<T>(path: string, signal?: AbortSignal): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  delete(path: string): Promise<void>;
}

/** Authenticated client. A 401 response ends the session through `onUnauthorized`. */
export function createApiClient(options: { getToken: () => string | null; onUnauthorized: () => void }): ApiClient {
  const withAuth = async <T>(path: string, requestOptions: RequestOptions): Promise<T> => {
    try {
      return await requestJson<T>(path, { ...requestOptions, token: options.getToken() });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) options.onUnauthorized();
      throw error;
    }
  };

  return {
    get: (path, signal) => withAuth(path, { signal }),
    post: (path, body) => withAuth(path, { method: 'POST', body }),
    delete: (path) => withAuth<void>(path, { method: 'DELETE' }),
  };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
