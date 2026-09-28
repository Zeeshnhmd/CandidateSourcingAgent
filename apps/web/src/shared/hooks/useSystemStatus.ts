import { useQuery } from '@tanstack/react-query';
import type { IntegrationId, IntegrationStatus, SystemStatus } from '@csa/contracts';
import { useApiClient } from '../lib/ApiClientContext';

export function useSystemStatus() {
  const api = useApiClient();
  return useQuery({
    queryKey: ['system-status'],
    queryFn: ({ signal }) => api.get<SystemStatus>('/system/status', signal),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function findIntegration(status: SystemStatus | undefined, id: IntegrationId): IntegrationStatus | undefined {
  return status?.integrations.find((integration) => integration.id === id);
}
