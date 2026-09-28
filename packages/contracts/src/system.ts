export type IntegrationId = 'ai' | 'github' | 'talent-source';

/** `live` uses the real provider, `fallback` a built-in substitute, `offline` is unreachable. */
export type IntegrationState = 'live' | 'fallback' | 'offline';

export interface IntegrationStatus {
  id: IntegrationId;
  label: string;
  state: IntegrationState;
  detail: string;
}

export interface SystemStatus {
  integrations: IntegrationStatus[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
