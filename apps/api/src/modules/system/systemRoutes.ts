import { Router } from 'express';
import type { IntegrationStatus, SystemStatus } from '@csa/contracts';
import type { DiscoveryAdapter, LiveGitHubEvidenceAdapter } from '../../adapters/types';
import type { AppConfig } from '../../config/env';

export function createSystemRouter(deps: {
  config: AppConfig;
  discovery: readonly DiscoveryAdapter[];
  github: LiveGitHubEvidenceAdapter;
}): Router {
  const router = Router();
  const { config } = deps;

  const talentSourceStatus = (adapter: DiscoveryAdapter): Promise<IntegrationStatus> =>
    adapter.checkHealth().then(
      () => ({
        id: 'talent-source',
        label: adapter.info.name,
        state: 'live',
        detail: 'Sample talent pool served by the talent network service',
      }),
      () => ({
        id: 'talent-source',
        label: adapter.info.name,
        state: 'offline',
        detail: `Not reachable at ${config.mockTalentUrl}. Start it with npm run dev:mock`,
      }),
    );

  const githubStatus = async (): Promise<IntegrationStatus> => {
    try {
      const quota = await deps.github.checkRateLimit();
      const access = quota.authenticated ? 'Authenticated' : 'Unauthenticated';
      return {
        id: 'github',
        label: 'GitHub',
        state: 'live',
        detail: `${access} GitHub REST for discovery and evidence. ${quota.remaining.toLocaleString('en')} of ${quota.limit.toLocaleString('en')} requests left this hour.`,
      };
    } catch (error) {
      return {
        id: 'github',
        label: 'GitHub',
        state: 'offline',
        detail: error instanceof Error ? error.message : 'GitHub is unreachable',
      };
    }
  };

  router.get('/status', async (_req, res) => {
    const [sources, github] = await Promise.all([Promise.all(deps.discovery.map(talentSourceStatus)), githubStatus()]);
    const status: SystemStatus = {
      integrations: [
        ...sources,
        config.openAi
          ? {
              id: 'ai',
              label: 'AI analysis',
              state: 'live',
              detail: `OpenAI ${config.openAi.model} with ${config.openAi.embeddingModel}`,
            }
          : {
              id: 'ai',
              label: 'AI analysis',
              state: 'fallback',
              detail: 'Rule-based analysis. Set OPENAI_API_KEY in apps/api/.env to enable OpenAI',
            },
        github,
      ],
    };
    res.json(status);
  });

  return router;
}
