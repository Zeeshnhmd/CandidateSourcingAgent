import { useMutation } from '@tanstack/react-query';
import type { JobAnalysisRequest, JobAnalysisResult } from '@csa/contracts';
import { useApiClient } from '../../shared/lib/ApiClientContext';

export function useAnalyzeJobDescription() {
  const api = useApiClient();
  return useMutation({
    mutationFn: (jobDescription: string) =>
      api.post<JobAnalysisResult>('/job-analysis', { jobDescription } satisfies JobAnalysisRequest),
  });
}
