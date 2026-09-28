import { useMemo, type ReactNode } from 'react';
import { StyleProvider } from '@ant-design/cssinjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import { AuthProvider } from '../features/auth/AuthProvider';
import { useAuth } from '../features/auth/authContext';
import { ApiClientProvider } from '../shared/lib/ApiClientContext';
import { ApiError, createApiClient } from '../shared/lib/apiClient';
import { antdConfig } from '../theme/antdTheme';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
          return !isClientError && failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

function AuthenticatedApiClient({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const token = session?.token ?? null;
  const client = useMemo(
    () => createApiClient({ getToken: () => token, onUnauthorized: () => signOut('expired') }),
    [token, signOut],
  );
  return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
}

export function AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider {...antdConfig}>
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AuthenticatedApiClient>{children}</AuthenticatedApiClient>
            </AuthProvider>
          </QueryClientProvider>
        </AntdApp>
      </ConfigProvider>
    </StyleProvider>
  );
}
