import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSession, SystemStatus } from '@csa/contracts';
import { AppProviders, createQueryClient } from '../../app/AppProviders';
import { appRoutes } from '../../app/routes';

const session: AuthSession = {
  token: 'token-123',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: { id: 'demo-user', email: 'demo@candidate.local', name: 'Demo Recruiter' },
};

const status: SystemStatus = {
  integrations: [{ id: 'ai', label: 'AI analysis', state: 'fallback', detail: 'Deterministic fallback' }],
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });

function mockApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    if (url === '/api/auth/login') {
      const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as { password?: string };
      return Promise.resolve(
        body.password === 'Demo@123'
          ? json(session)
          : json({ error: { code: 'invalid_credentials', message: 'Incorrect email or password' } }, { status: 401 }),
      );
    }
    if (url === '/api/auth/logout') return Promise.resolve(new Response(null, { status: 204 }));
    if (url === '/api/system/status') return Promise.resolve(json(status));
    if (url === '/api/sourcing/runs') return Promise.resolve(json([]));
    return Promise.resolve(json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 }));
  });
}

function renderApp(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

describe('demo authentication flow', () => {
  it('redirects unauthenticated users to sign in', async () => {
    mockApi();
    const router = renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('validates the form and shows an error for wrong credentials', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp('/sign-in');

    const email = await screen.findByLabelText('Work email');
    const password = screen.getByLabelText('Password');
    await user.clear(email);
    await user.clear(password);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();

    await user.type(email, 'demo@candidate.local');
    await user.type(password, 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password do not match');
  });

  it('prefills the workspace account, opens the protected shell and signs out', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    const router = renderApp('/');

    expect(await screen.findByLabelText('Work email')).toHaveValue('demo@candidate.local');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'New search' })).toBeInTheDocument();
    expect(sessionStorage.getItem('csa.demo-session')).toContain('token-123');

    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(await screen.findByText('Sign out'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(sessionStorage.getItem('csa.demo-session')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }));
  });

  it('restores a stored session and ignores expired ones', async () => {
    mockApi();
    sessionStorage.setItem(
      'csa.demo-session',
      JSON.stringify({ ...session, expiresAt: new Date(Date.now() - 1000).toISOString() }),
    );
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
  });
});
