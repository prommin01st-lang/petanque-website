import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { I18nProvider } from '@/i18n/I18nContext';
import { useShellContext } from './useShellContext';
import { api } from '@/lib/api';
import type { Project } from '@/lib/types';

vi.mock('@/lib/api', async (orig) => ({ ...(await orig<typeof import('@/lib/api')>()), api: { projects: vi.fn(), posts: vi.fn(), post: vi.fn() } }));

const state = { cwd: '~', setCwd() {}, history: [], clear() {}, close() {} };

it('aborting the shell wait does not poison the shared query', async () => {
  let resolveFetch!: (v: { items: Project[]; total: number; page: number; perPage: number }) => void;
  vi.mocked(api.projects).mockImplementation(() => new Promise((r) => { resolveFetch = r as typeof resolveFetch; }));
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}><I18nProvider><MemoryRouter>{children}</MemoryRouter></I18nProvider></QueryClientProvider>
  );
  const { result } = renderHook(() => useShellContext(state), { wrapper });
  const ac = new AbortController();
  const p = result.current.data.projects(ac.signal);
  ac.abort();
  await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  expect(qc.getQueryState(['projects'])?.status).not.toBe('error');
  resolveFetch({ items: [], total: 0, page: 1, perPage: 50 } as never);
  await expect(qc.fetchQuery({ queryKey: ['projects'], queryFn: () => Promise.reject(new Error('x')) })).resolves.toMatchObject({ items: [] });
  expect(qc.getQueryState(['projects'])?.status).toBe('success');
});
