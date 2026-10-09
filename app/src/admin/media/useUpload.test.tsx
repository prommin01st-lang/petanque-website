import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import * as apiModule from '@/lib/api';
import type { MediaItem } from '@/lib/types';
import { I18nProvider } from '@/i18n/I18nContext';
import { useUpload } from './useUpload';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup() {
  const qc = new QueryClient();
  const inv = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}><I18nProvider>{children}</I18nProvider></QueryClientProvider>
  );
  return { inv, ...renderHook(() => useUpload(), { wrapper }) };
}

it('rejects non-images and oversize files before uploading', async () => {
  const up = vi.spyOn(apiModule, 'upload').mockResolvedValue({ id: 1, url: '/uploads/a.png' } as MediaItem);
  const { result, inv } = setup();
  const ok = new File(['x'], 'a.png', { type: 'image/png' });
  const txt = new File(['x'], 'a.txt', { type: 'text/plain' });
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'b.png', { type: 'image/png' });
  let items: MediaItem[] = [];
  await act(async () => { items = await result.current.uploadFiles([ok, txt, big]); });
  expect(up).toHaveBeenCalledTimes(1);
  expect(items).toHaveLength(1);
  expect(toast.error).toHaveBeenCalledTimes(2);
  expect(inv).toHaveBeenCalledWith({ queryKey: ['admin', 'media'] });
  expect(result.current.uploading).toBe(false);
});

it('skips a file the server rejects and continues with the rest', async () => {
  const up = vi.spyOn(apiModule, 'upload')
    .mockRejectedValueOnce(new apiModule.ApiError(413, 'too_large', 'too big', {}))
    .mockResolvedValueOnce({ id: 2, url: '/uploads/c.png' } as MediaItem);
  const { result } = setup();
  const a = new File(['x'], 'a.png', { type: 'image/png' });
  const c = new File(['x'], 'c.png', { type: 'image/png' });
  let items: MediaItem[] = [];
  await act(async () => { items = await result.current.uploadFiles([a, c]); });
  expect(up).toHaveBeenCalledTimes(2);
  expect(items.map((i) => i.id)).toEqual([2]);
  expect(toast.error).toHaveBeenCalledTimes(1);
});

it('stays uploading until every overlapping call has finished', async () => {
  const resolvers: Array<(m: MediaItem) => void> = [];
  vi.spyOn(apiModule, 'upload').mockImplementation(() => new Promise<MediaItem>((r) => { resolvers.push(r); }));
  const { result } = setup();
  const f = () => new File(['x'], 'a.png', { type: 'image/png' });
  let p1!: Promise<MediaItem[]>, p2!: Promise<MediaItem[]>;
  act(() => { p1 = result.current.uploadFiles([f()]); p2 = result.current.uploadFiles([f()]); });
  expect(result.current.uploading).toBe(true);
  await act(async () => { resolvers[0]({ id: 1 } as MediaItem); await p1; });
  expect(result.current.uploading).toBe(true);
  await act(async () => { resolvers[1]({ id: 2 } as MediaItem); await p2; });
  expect(result.current.uploading).toBe(false);
});
