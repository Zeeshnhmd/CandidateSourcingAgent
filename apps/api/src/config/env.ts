import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface OpenAiConfig {
  apiKey: string;
  model: string;
  embeddingModel: string;
}

export interface AppConfig {
  port: number;
  mockTalentUrl: string;
  githubToken: string | null;
  /** Explicit opt-in mapping of source record ids to real public GitHub usernames. */
  githubProfileMap: ReadonlyMap<string, string>;
  openAi: OpenAiConfig | null;
  sessionTtlMs: number;
  /** Where saved searches are stored. */
  dataDir: string;
}

const DEFAULT_SESSION_TTL_MINUTES = 60;

export function loadEnvFile(): void {
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

function readOptional(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseGithubProfileMap(value: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!value) return map;
  for (const entry of value.split(',')) {
    const [recordId, username] = entry.split(':').map((part) => part.trim());
    if (recordId && username && /^[a-z\d](?:[a-z\d-]{0,38})$/i.test(username)) {
      map.set(recordId, username);
    }
  }
  return map;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const openAiKey = readOptional(env.OPENAI_API_KEY);
  return {
    port: Number(env.PORT) || 4000,
    mockTalentUrl: (readOptional(env.MOCK_TALENT_URL) ?? 'http://localhost:3001').replace(/\/$/, ''),
    githubToken: readOptional(env.GITHUB_TOKEN),
    githubProfileMap: parseGithubProfileMap(readOptional(env.GITHUB_PROFILE_MAP)),
    openAi: openAiKey
      ? {
          apiKey: openAiKey,
          model: readOptional(env.OPENAI_MODEL) ?? 'gpt-4.1-mini',
          embeddingModel: readOptional(env.OPENAI_EMBEDDING_MODEL) ?? 'text-embedding-3-small',
        }
      : null,
    sessionTtlMs: DEFAULT_SESSION_TTL_MINUTES * 60_000,
    dataDir: readOptional(env.DATA_DIR) ?? fileURLToPath(new URL('../../data', import.meta.url)),
  };
}
