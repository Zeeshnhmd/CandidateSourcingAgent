import type { AuthSession, LoginRequest } from '@csa/contracts';
import { requestJson } from '../../shared/lib/apiClient';

export function login(credentials: LoginRequest): Promise<AuthSession> {
  return requestJson<AuthSession>('/auth/login', { method: 'POST', body: credentials });
}

export function logout(token: string): Promise<void> {
  return requestJson<void>('/auth/logout', { method: 'POST', token });
}
