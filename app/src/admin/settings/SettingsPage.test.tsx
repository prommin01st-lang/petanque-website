import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { I18nProvider } from '@/i18n/I18nContext';
import { ApiError } from '@/lib/api';
import SettingsPage from './SettingsPage';

const auth = vi.hoisted(() => ({
  me: vi.fn(), providers: vi.fn(), sessions: vi.fn(), revokeSession: vi.fn(), logoutAll: vi.fn(),
  regenerateRecovery: vi.fn(), linkGitHub: vi.fn(), unlinkGitHub: vi.fn(),
}));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), api: { auth } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const me = { username: 'admin', githubLogin: null as string | null, totpEnabled: true, authMethod: 'password', csrfToken: 't' };
const sess = (id: string, current: boolean) => ({ id, ip: '1.2.3.4', userAgent: 'UA', authMethod: 'password', createdAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-08T00:00:00.000Z', current });

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

function setup(url = '/admin/settings') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={[url]}>
          <Where />
          <Routes>
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/login" element={<p>login page</p>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auth.me.mockResolvedValue(me);
  auth.providers.mockResolvedValue({ github: true });
  auth.sessions.mockResolvedValue({ items: [sess('a', true), sess('b', false)] });
});

it('links GitHub via a TOTP step-up and redirects', async () => {
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  auth.linkGitHub.mockResolvedValue({ url: 'https://github.com/login/oauth/authorize?x=1' });
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '[link github]' }));
  await userEvent.type(screen.getByLabelText('Authenticator code'), '123456{Enter}');
  await waitFor(() => expect(auth.linkGitHub).toHaveBeenCalledWith('123456'));
  await waitFor(() => expect(assign).toHaveBeenCalledWith('https://github.com/login/oauth/authorize?x=1'));
  vi.unstubAllGlobals();
});

it.each(['javascript:alert(1)', 'data:text/html,hi', 'not a url'])('refuses to redirect to %s', async (url) => {
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  auth.linkGitHub.mockResolvedValue({ url });
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '[link github]' }));
  await userEvent.type(screen.getByLabelText('Authenticator code'), '123456{Enter}');
  expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.');
  expect(assign).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it('shows a translated error for a wrong link code', async () => {
  auth.linkGitHub.mockRejectedValue(new ApiError(401, 'invalid_code', 'bad'));
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '[link github]' }));
  await userEvent.type(screen.getByLabelText('Authenticator code'), '000000{Enter}');
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid code. Wait for the next code');
});

it('unlinks with a code and refreshes me', async () => {
  auth.me.mockResolvedValue({ ...me, githubLogin: 'octo' });
  auth.unlinkGitHub.mockResolvedValue(undefined);
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '[unlink]' }));
  await userEvent.type(screen.getByLabelText('Authenticator code'), '123456{Enter}');
  await waitFor(() => expect(auth.unlinkGitHub).toHaveBeenCalledWith('123456'));
  await waitFor(() => expect(auth.me).toHaveBeenCalledTimes(2));
});

it('regenerates recovery codes after a TOTP code', async () => {
  auth.regenerateRecovery.mockResolvedValue({ recoveryCodes: ['aaaa-1111', 'bbbb-2222'] });
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '[regenerate recovery codes]' }));
  await userEvent.type(screen.getByLabelText('Authenticator code'), '123456{Enter}');
  expect(await screen.findByText('aaaa-1111')).toBeInTheDocument();
});

it('marks the current session and revokes others', async () => {
  auth.revokeSession.mockResolvedValue(undefined);
  setup();
  const revokes = await screen.findAllByRole('button', { name: '[revoke]' });
  expect(revokes).toHaveLength(1);
  await userEvent.click(revokes[0]);
  await waitFor(() => expect(auth.revokeSession).toHaveBeenCalledWith('b'));
});

it('logout everywhere stays put on failure and leaves on success', async () => {
  auth.logoutAll.mockRejectedValueOnce(new ApiError(500, 'internal', 'boom'));
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '[logout everywhere]' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('still active');
  expect(screen.queryByText('login page')).not.toBeInTheDocument();
  auth.logoutAll.mockResolvedValueOnce(undefined);
  await userEvent.click(screen.getByRole('button', { name: '[logout everywhere]' }));
  expect(await screen.findByText('login page')).toBeInTheDocument();
});

it('reports ?linked=1 once and strips the query', async () => {
  setup('/admin/settings?linked=1');
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/admin\/settings$/));
  expect(toast.success).toHaveBeenCalledTimes(1);
});

it('translates ?error=github_in_use', async () => {
  setup('/admin/settings?error=github_in_use');
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That GitHub account is already linked to another admin.'));
  expect(screen.getByTestId('where')).toHaveTextContent(/^\/admin\/settings$/);
});
