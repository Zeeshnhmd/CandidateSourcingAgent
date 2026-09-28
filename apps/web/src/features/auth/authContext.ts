import { createContext, useContext } from 'react';
import type { AuthSession } from '@csa/contracts';

export type SignOutReason = 'user' | 'expired';

export interface AuthContextValue {
  session: AuthSession | null;
  /** Message for the sign-in page, for example after the session expired. */
  notice: string | null;
  signIn: (session: AuthSession) => void;
  signOut: (reason?: SignOutReason) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
