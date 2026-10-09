import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@/i18n/I18nContext';
import AuditPage from './AuditPage';

const admin = vi.hoisted(() => ({ audit: vi.fn() }));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), api: { admin } }));

it('paginates with prev/next', async () => {
  admin.audit.mockImplementation(async (page: number) => ({
    items: [{ id: page, action: `act-${page}`, entity: 'post', entityId: '1', ip: '::1', createdAt: '2026-01-01T00:00:00.000Z' }],
    page, perPage: 1, total: 2,
  }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><I18nProvider><AuditPage /></I18nProvider></QueryClientProvider>);
  expect(await screen.findByText('act-1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '[prev]' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: '[next]' }));
  await waitFor(() => expect(screen.getByText('act-2')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: '[next]' })).toBeDisabled();
});
