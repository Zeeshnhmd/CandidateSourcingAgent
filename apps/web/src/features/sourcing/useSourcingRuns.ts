import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CandidatePersona, SourcingRun, SourcingRunSummary, StartSourcingRequest } from '@csa/contracts';
import { useApiClient } from '../../shared/lib/ApiClientContext';

const runsKey = ['sourcing-runs'] as const;
const runKey = (runId: string) => ['sourcing-run', runId] as const;

/** Saved searches, newest first. */
export function useSavedSearches() {
  const api = useApiClient();
  return useQuery({
    queryKey: runsKey,
    queryFn: ({ signal }) => api.get<SourcingRunSummary[]>('/sourcing/runs', signal),
    staleTime: 30_000,
  });
}

export function useSourcingRun(runId: string) {
  const api = useApiClient();
  return useQuery({
    queryKey: runKey(runId),
    queryFn: ({ signal }) => api.get<SourcingRun>(`/sourcing/runs/${encodeURIComponent(runId)}`, signal),
    staleTime: Infinity,
  });
}

export function useStartSourcing() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (persona: CandidatePersona) =>
      api.post<SourcingRun>('/sourcing/runs', { persona } satisfies StartSourcingRequest),
    onSuccess: (run) => {
      queryClient.setQueryData(runKey(run.id), run);
      void queryClient.invalidateQueries({ queryKey: runsKey });
    },
  });
}

export function useDeleteSearch() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.delete(`/sourcing/runs/${encodeURIComponent(runId)}`),
    onSuccess: (_result, runId) => {
      queryClient.setQueryData<SourcingRunSummary[]>(runsKey, (runs) => runs?.filter((run) => run.id !== runId));
      queryClient.removeQueries({ queryKey: runKey(runId) });
    },
  });
}
