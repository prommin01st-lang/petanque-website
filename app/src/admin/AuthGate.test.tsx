import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import AuthGate from './AuthGate';

const auth = vi.hoisted(() => ({ me: vi.fn() }));
const csrf = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { auth }, setCsrfToken: csrf };
});

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/admin/posts']}>
          <Routes>
            <Route path="/admin/login" element={<p>login page</p>} />
            <Route element={<AuthGate />}>
              <Route path="/admin/posts" element={<p>posts page</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

it('renders the outlet and stores the CSRF token when logged in', async () => {
  auth.me.mockResolvedValue({ username: 'admin', githubLogin: null, totpEnabled: true, authMethod: 'password', csrfToken: 'tok' });
  setup();
  expect(await screen.findByText('posts page')).toBeInTheDocument();
  expect(csrf).toHaveBeenCalledWith('tok');
});

it('redirects to the login page on 401 and clears the CSRF token', async () => {
  const { ApiError } = await import('@/lib/api');
  auth.me.mockRejectedValue(new ApiError(401, 'unauthorized', 'Login required.'));
  setup();
  expect(await screen.findByText('login page')).toBeInTheDocument();
  expect(csrf).toHaveBeenCalledWith(null);
});
