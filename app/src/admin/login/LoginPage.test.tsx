import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '@/i18n/I18nContext';
import LoginPage from './LoginPage';

const auth = vi.hoisted(() => ({
  providers: vi.fn(), login: vi.fn(), totpSetup: vi.fn(), totpVerify: vi.fn(), recovery: vi.fn(), me: vi.fn(),
}));
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { auth } };
});
vi.mock('qrcode', () => ({ default: { toDataURL: () => Promise.resolve('data:image/png;base64,AAA') } }));

function setup(entry = '/admin/login') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<p>dashboard</p>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auth.providers.mockResolvedValue({ github: true });
});

it('password then TOTP logs in', async () => {
  auth.login.mockResolvedValue({ next: 'totp' });
  auth.totpVerify.mockResolvedValue({});
  setup();
  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), 'very-long-password');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.type(await screen.findByLabelText(/code/i), '123456');
  await userEvent.click(screen.getByRole('button', { name: /verify/i }));
  expect(await screen.findByText('dashboard')).toBeInTheDocument();
  expect(auth.totpVerify).toHaveBeenCalledWith('123456');
});

it('first login walks through TOTP setup and recovery codes', async () => {
  auth.login.mockResolvedValue({ next: 'totp_setup' });
  auth.totpSetup.mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', otpauthUrl: 'otpauth://totp/x' });
  auth.totpVerify.mockResolvedValue({ recoveryCodes: ['abcd-efgh', 'jkmn-pqrs'] });
  setup();
  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), 'very-long-password');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
  expect(await screen.findByRole('img')).toHaveAttribute('src', 'data:image/png;base64,AAA');
  await userEvent.type(screen.getByLabelText(/code/i), '654321');
  await userEvent.click(screen.getByRole('button', { name: /verify/i }));
  expect(await screen.findByText('abcd-efgh')).toBeInTheDocument();
  const cont = screen.getByRole('button', { name: /continue/i });
  expect(cont).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(cont);
  expect(await screen.findByText('dashboard')).toBeInTheDocument();
});

it('shows server errors and the github_not_linked query error', async () => {
  const { ApiError } = await import('@/lib/api');
  auth.login.mockRejectedValue(new ApiError(401, 'invalid_credentials', 'x'));
  setup('/admin/login?error=github_not_linked');
  expect(await screen.findByText(/not linked/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute('href', '/api/auth/github/start?mode=login');
  await userEvent.type(screen.getByLabelText(/username/i), 'admin');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid username or password/i);
});

it('shows a GitHub callback error without the divider when GitHub is disabled', async () => {
  auth.providers.mockResolvedValue({ github: false });
  setup('/admin/login?error=github_failed');
  expect(await screen.findByText(/github login failed/i)).toBeInTheDocument();
  expect(screen.queryByText(/— or —/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /github/i })).not.toBeInTheDocument();
});
