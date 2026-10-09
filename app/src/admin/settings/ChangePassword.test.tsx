import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I18nProvider } from '@/i18n/I18nContext';
import { ApiError } from '@/lib/api';
import ChangePassword from './ChangePassword';

const auth = vi.hoisted(() => ({ changePassword: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), api: { auth } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup() {
  const qc = new QueryClient();
  const inv = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <ChangePassword />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { inv };
}

async function fill(cur: string, next: string, confirm: string, code: string) {
  await userEvent.click(screen.getByRole('button', { name: '[change password]' }));
  await userEvent.type(screen.getByLabelText('Current password'), cur);
  await userEvent.type(screen.getByLabelText('New password (12+ characters)'), next);
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm);
  await userEvent.type(screen.getByLabelText('Authenticator code'), code);
  await userEvent.click(screen.getByRole('button', { name: '[confirm]' }));
}

it('validates length, match and difference before calling the API', async () => {
  setup();
  await fill('old-password-123', 'short', 'short', '123456');
  expect(await screen.findByText('ERR: Use at least 12 characters.')).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText('New password (12+ characters)'));
  await userEvent.type(screen.getByLabelText('New password (12+ characters)'), 'brand-new-password');
  await userEvent.click(screen.getByRole('button', { name: '[confirm]' }));
  expect(await screen.findByText('ERR: The passwords do not match.')).toBeInTheDocument();
  expect(auth.changePassword).not.toHaveBeenCalled();
});

it('rejects a new password equal to the current one', async () => {
  setup();
  await fill('same-password-123', 'same-password-123', 'same-password-123', '123456');
  expect(await screen.findByText('ERR: Choose a different password from the current one.')).toBeInTheDocument();
  expect(auth.changePassword).not.toHaveBeenCalled();
});

it('submits, toasts, refreshes sessions and closes the form', async () => {
  auth.changePassword.mockResolvedValue(undefined);
  const { inv } = setup();
  await fill('old-password-123', 'brand-new-password', 'brand-new-password', '123456');
  await waitFor(() =>
    expect(auth.changePassword).toHaveBeenCalledWith({ currentPassword: 'old-password-123', newPassword: 'brand-new-password', code: '123456' }),
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Password changed. Other devices were signed out.'));
  expect(inv).toHaveBeenCalledWith({ queryKey: ['admin', 'sessions'] });
  expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
});

it('shows a wrong current password and clears the code, keeping the passwords', async () => {
  auth.changePassword.mockRejectedValue(new ApiError(401, 'invalid_credentials', 'x'));
  setup();
  await fill('wrong-password-1', 'brand-new-password', 'brand-new-password', '123456');
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
  expect(screen.getByLabelText('Authenticator code')).toHaveValue('');
  expect(screen.getByLabelText('New password (12+ characters)')).toHaveValue('brand-new-password');
});

it('maps a server field error onto the new password field', async () => {
  auth.changePassword.mockRejectedValue(new ApiError(422, 'validation_failed', 'x', { newPassword: 'Must be at most 72 bytes.' }));
  setup();
  await fill('old-password-123', 'brand-new-password', 'brand-new-password', '123456');
  expect(await screen.findByText('ERR: Must be at most 72 bytes.')).toBeInTheDocument();
});
