import type { RouteObject } from 'react-router';
import { RequireAuth } from '../features/auth/RequireAuth';
import { SignInPage } from '../features/auth/SignInPage';
import { CandidateResultsPage } from '../features/candidates/CandidateResultsPage';
import { NewSearchPage } from '../features/sourcing/NewSearchPage';
import { SavedSearchesPage } from '../features/sourcing/SavedSearchesPage';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';
import type { RouteHandle } from './TopBar';

const handle = (value: RouteHandle) => value;

export const appRoutes: RouteObject[] = [
  { path: '/sign-in', element: <SignInPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <NewSearchPage />, handle: handle({ crumbs: [{ label: 'New search' }] }) },
      { path: 'searches', element: <SavedSearchesPage />, handle: handle({ crumbs: [{ label: 'Saved searches' }] }) },
      {
        path: 'searches/:runId',
        element: <CandidateResultsPage />,
        handle: handle({ crumbs: [{ label: 'Saved searches', to: '/searches' }, { label: 'Shortlist' }] }),
      },
      { path: '*', element: <NotFoundPage />, handle: handle({ crumbs: [{ label: 'Not found' }] }) },
    ],
  },
];
