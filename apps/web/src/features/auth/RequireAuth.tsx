import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './authContext';

export interface SignInLocationState {
  from?: string;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    const state: SignInLocationState = { from: `${location.pathname}${location.search}` };
    return <Navigate to="/sign-in" replace state={state} />;
  }
  return children;
}
