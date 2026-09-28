import { join } from 'node:path';
import { createFallbackAiAdapter } from './adapters/ai/fallback/fallbackAiAdapter';
import { createOpenAiAdapter } from './adapters/ai/openAiAdapter';
import { createGitHubEvidenceAdapter, GITHUB_INFO } from './adapters/evidence/githubEvidenceAdapter';
import { createMockGitHubEvidenceAdapter } from './adapters/evidence/mockGitHubEvidenceAdapter';
import { createGitHubClient } from './adapters/github/githubClient';
import { createGitHubTalentAdapter } from './adapters/sources/github/githubTalentAdapter';
import { createMockTalentAdapter } from './adapters/sources/mock-talent/mockTalentAdapter';
import { createApp } from './app';
import { loadConfig, loadEnvFile } from './config/env';
import { createAuthService } from './modules/auth/authService';
import { createAiService } from './services/ai/aiService';
import { createEvidenceService } from './services/evidence/evidenceService';
import { createFileRunStore } from './services/sourcing/runStore';
import { createSourcingService } from './services/sourcing/sourcingService';

loadEnvFile();
const config = loadConfig();

const fallbackAi = createFallbackAiAdapter();
const ai = createAiService(config.openAi ? createOpenAiAdapter(config.openAi) : fallbackAi, fallbackAi);

const githubClient = createGitHubClient({ token: config.githubToken });
const github = createGitHubEvidenceAdapter({ client: githubClient });
const talentNetwork = createMockTalentAdapter({ baseUrl: config.mockTalentUrl });
const discovery = [talentNetwork, createGitHubTalentAdapter({ client: githubClient })];

const sourcing = createSourcingService({
  registry: { discovery, enrichment: [talentNetwork], evidence: GITHUB_INFO, ai: ai.primary.info },
  evidence: createEvidenceService({
    live: github,
    mock: createMockGitHubEvidenceAdapter({ baseUrl: config.mockTalentUrl }),
    profileMap: config.githubProfileMap,
  }),
  ai,
  runs: createFileRunStore(join(config.dataDir, 'sourcing-runs.json')),
});

const app = createApp({
  config,
  auth: createAuthService({ ttlMs: config.sessionTtlMs }),
  ai,
  sourcing,
  discovery: [talentNetwork],
  github,
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(
    `AI: ${ai.primary.info.name} | GitHub: ${config.githubToken ? 'token set' : 'no token (60 requests per hour)'} | Talent network: ${config.mockTalentUrl}`,
  );
});
