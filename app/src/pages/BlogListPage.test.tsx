import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as apiModule from '@/lib/api';
import { I18nProvider } from '@/i18n/I18nContext';
import type { PostSummary } from '@/lib/types';
import BlogListPage from './BlogListPage';

function LocationProbe() {
  const { search } = useLocation();
  const type = useNavigationType();
  return <output data-testid="search" data-nav={type}>{search}</output>;
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/blog" element={<><BlogListPage /><LocationProbe /></>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

const post = (n: number): PostSummary => ({
  slug: `post-${n}`, title: { en: `Post ${n}`, th: '' }, excerpt: { en: '', th: '' }, tags: ['go'], coverUrl: '',
  publishedAt: '2026-10-01T00:00:00Z',
});

describe('BlogListPage', () => {
  it('clamps an out-of-range ?page to the last page (replacing the URL)', async () => {
    const spy = vi.spyOn(apiModule.api, 'posts').mockImplementation(async ({ page = 1 } = {}) => ({
      items: page <= 3 ? [post(page)] : [], page, perPage: 10, total: 25,
    }));
    renderAt('/blog?tag=go&page=99');
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?tag=go&page=3'));
    expect(screen.getByTestId('search')).toHaveAttribute('data-nav', 'REPLACE');
    expect(await screen.findByText('Post 3')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith({ page: 3, perPage: 10, tag: 'go' });
  });

  it('leaves an in-range page alone', async () => {
    vi.spyOn(apiModule.api, 'posts').mockResolvedValue({ items: [post(2)], page: 2, perPage: 10, total: 25 });
    renderAt('/blog?page=2');
    expect(await screen.findByText('Post 2')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?page=2');
  });
});
