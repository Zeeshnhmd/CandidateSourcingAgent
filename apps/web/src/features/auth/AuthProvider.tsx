import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthSession } from '@csa/contracts';
import { logout } from './authApi';
import { AuthContext, type AuthContextValue, type SignOutReason } from './authContext';
import { clearStoredSession, readStoredSession, storeSession } from './sessionStore';

const EXPIRED_NOTICE = 'Your demo session expired. Please sign in again.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [notice, setNotice] = useState<string | null>(null);

  const signIn = useCallback((next: AuthSession) => {
    storeSession(next);
    setNotice(null);
    setSession(next);
  }, []);

  const signOut = useCallback(
    (reason: SignOutReason = 'user') => {
      if (session && reason === 'user') void logout(session.token).catch(() => undefined);
      clearStoredSession();
      setSession(null);
      setNotice(reason === 'expired' ? EXPIRED_NOTICE : null);
      queryClient.clear();
    },
    [session, queryClient],
  );

  useEffect(() => {
    if (!session) return;
    const remaining = Date.parse(session.expiresAt) - Date.now();
    const timer = window.setTimeout(() => signOut('expired'), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [session, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, notice, signIn, signOut }),
    [session, notice, signIn, signOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
