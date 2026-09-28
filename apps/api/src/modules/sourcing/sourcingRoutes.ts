import { Router } from 'express';
import type { SourcingRun, SourcingRunSummary } from '@csa/contracts';
import { parsePersona } from '../../services/job-analysis/persona';
import type { SourcingService } from '../../services/sourcing/sourcingService';
import { isRecord } from '../../shared/guards';
import { HttpError } from '../../shared/httpError';

export function createSourcingRouter(sourcing: SourcingService): Router {
  const router = Router();

  router.post('/runs', async (req, res) => {
    const body: unknown = req.body;
    const persona = isRecord(body) ? parsePersona(body.persona) : null;
    if (!persona) throw new HttpError(400, 'invalid_persona', 'A valid candidate persona is required');
    const run: SourcingRun = await sourcing.start(persona);
    res.status(201).json(run);
  });

  router.get('/runs', (_req, res) => {
    const runs: SourcingRunSummary[] = sourcing.list();
    res.json(runs);
  });

  router.delete('/runs/:runId', (req, res) => {
    if (!sourcing.delete(req.params.runId))
      throw new HttpError(404, 'run_not_found', 'This saved search no longer exists.');
    res.status(204).end();
  });

  router.get('/runs/:runId', (req, res) => {
    const run = sourcing.get(req.params.runId);
    if (!run) {
      throw new HttpError(404, 'run_not_found', 'This saved search no longer exists.');
    }
    res.json(run);
  });

  return router;
}
