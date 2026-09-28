import { Router } from 'express';
import type { JobAnalysisResult } from '@csa/contracts';
import type { AiService } from '../../services/ai/aiService';
import { isRecord, isString } from '../../shared/guards';
import { HttpError } from '../../shared/httpError';

const JOB_DESCRIPTION_LIMITS = { min: 80, max: 20_000 } as const;

export function createJobAnalysisRouter(ai: AiService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const body: unknown = req.body;
    const jobDescription = isRecord(body) && isString(body.jobDescription) ? body.jobDescription.trim() : '';
    if (jobDescription.length < JOB_DESCRIPTION_LIMITS.min || jobDescription.length > JOB_DESCRIPTION_LIMITS.max) {
      throw new HttpError(
        400,
        'invalid_job_description',
        `The job description must be between ${JOB_DESCRIPTION_LIMITS.min} and ${JOB_DESCRIPTION_LIMITS.max} characters`,
      );
    }

    const outcome = await ai.analyzeJobDescription(jobDescription);
    const warnings = outcome.warning ? [outcome.warning] : [];
    if (!outcome.value.mustHaveSkills.length) {
      warnings.push('No specific skills were detected. Add must-have skills before sourcing.');
    }
    const result: JobAnalysisResult = { persona: outcome.value, analyzedBy: outcome.provider, warnings };
    res.json(result);
  });

  return router;
}
