import express, { type Express } from 'express';
import type { DiscoveryAdapter, LiveGitHubEvidenceAdapter } from './adapters/types';
import type { AppConfig } from './config/env';
import { createAuthRouter } from './modules/auth/authRoutes';
import type { AuthService } from './modules/auth/authService';
import { requireAuth } from './modules/auth/requireAuth';
import { createJobAnalysisRouter } from './modules/job-analysis/jobAnalysisRoutes';
import { createSourcingRouter } from './modules/sourcing/sourcingRoutes';
import { createSystemRouter } from './modules/system/systemRoutes';
import type { AiService } from './services/ai/aiService';
import type { SourcingService } from './services/sourcing/sourcingService';
import { errorHandler, notFoundHandler } from './shared/httpError';

export interface AppDependencies {
  config: AppConfig;
  auth: AuthService;
  ai: AiService;
  sourcing: SourcingService;
  discovery: readonly DiscoveryAdapter[];
  github: LiveGitHubEvidenceAdapter;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', createAuthRouter(deps.auth));

  const protectedRoutes = express.Router();
  protectedRoutes.use(requireAuth(deps.auth));
  protectedRoutes.use('/job-analysis', createJobAnalysisRouter(deps.ai));
  protectedRoutes.use('/sourcing', createSourcingRouter(deps.sourcing));
  protectedRoutes.use(
    '/system',
    createSystemRouter({ config: deps.config, discovery: deps.discovery, github: deps.github }),
  );
  app.use('/api', protectedRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
