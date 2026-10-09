import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I18nProvider } from '@/i18n/I18nContext';
import * as apiModule from '@/lib/api';
import MediaPage from './MediaPage';

const admin = vi.hoisted(() => ({ media: vi.fn(), deleteMedia: vi.fn() }));
vi.mock('@/lib/api', async (orig) => {
  const real = await orig<typeof import('@/lib/api')>();
  return { ...real, api: { admin }, upload: vi.fn() };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const item = { id: 3, url: '/uploads/x.png', filename: 'x.png', originalName: 'shot.png', mime: 'image/png', size: 2048, width: 10, height: 20, createdAt: '' };

function setup() {
  admin.media.mockResolvedValue({ items: [item] });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><I18nProvider><MediaPage /></I18nProvider></QueryClientProvider>);
}

it('copies markdown to the clipboard', async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  setup();
  await user.click(await screen.findByRole('button', { name: '[copy md]' }));
  expect(write).toHaveBeenCalledWith('![shot.png](/uploads/x.png)');
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

it('shows translated feedback when the clipboard rejects', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
  setup();
  await user.click(await screen.findByRole('button', { name: '[copy md]' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Copy failed'));
});

it('deletes only after confirmation', async () => {
  admin.deleteMedia.mockResolvedValue(undefined);
  setup();
  await userEvent.click(await screen.findByRole('button', { name: '[delete]' }));
  expect(admin.deleteMedia).not.toHaveBeenCalled();
  await userEvent.click(await screen.findByRole('button', { name: '[confirm delete]' }));
  await waitFor(() => expect(admin.deleteMedia).toHaveBeenCalledWith(3));
});

it('uploads files dropped on the drop zone', async () => {
  const up = vi.mocked(apiModule.upload).mockResolvedValue(item);
  setup();
  await screen.findByRole('button', { name: '[copy md]' });
  const file = new File(['x'], 'a.png', { type: 'image/png' });
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } });
  await waitFor(() => expect(up).toHaveBeenCalledWith(file));
});
