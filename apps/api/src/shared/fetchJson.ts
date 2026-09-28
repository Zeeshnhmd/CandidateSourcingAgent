export class UpstreamError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number | null,
    message: string,
    /** Response headers of a failed HTTP response, for provider-specific handling such as rate limits. */
    readonly headers: Headers | null = null,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

interface FetchJsonOptions {
  provider: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

/** Fetches JSON from an external provider and normalises network, timeout and HTTP failures into `UpstreamError`. */
export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  const { provider, method = 'GET', headers = {}, body, timeoutMs = 10_000 } = options;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timed out' : 'is unreachable';
    throw new UpstreamError(provider, null, `${provider} ${reason}`);
  }

  if (!response.ok) {
    throw new UpstreamError(
      provider,
      response.status,
      `${provider} responded with HTTP ${response.status}`,
      response.headers,
    );
  }
  try {
    const payload: unknown = await response.json();
    return payload;
  } catch {
    throw new UpstreamError(provider, response.status, `${provider} returned invalid JSON`);
  }
}
