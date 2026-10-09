import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as apiModule from '@/lib/api';
import { I18nProvider, useI18n } from '@/i18n/I18nContext';
import type { Language } from '@/i18n/translations';
import BlogPostPage from './BlogPostPage';

function SetLang({ lang }: { lang: Language }) {
  const { setLang } = useI18n();
  useEffect(() => setLang(lang), [lang, setLang]);
  return null;
}

function renderAt(path: string, lang: Language) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <SetLang lang={lang} />
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/blog/:slug" element={<BlogPostPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe('BlogPostPage', () => {
  it('falls back to English with a note when Thai is missing', async () => {
    vi.spyOn(apiModule.api, 'post').mockResolvedValue({
      slug: 'hello', title: { en: 'Hello', th: '' }, excerpt: { en: '', th: '' }, body: { en: '## Body EN', th: '' },
      tags: ['go'], coverUrl: '', publishedAt: '2026-10-01T00:00:00Z',
    });
    renderAt('/blog/hello', 'th');
    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Body EN' })).toBeInTheDocument();
    expect(screen.getByText(/ยังไม่มีฉบับภาษาไทย/)).toBeInTheDocument();
  });

  it('shows not-found for unknown slugs', async () => {
    vi.spyOn(apiModule.api, 'post').mockRejectedValue(new apiModule.ApiError(404, 'not_found', 'nope'));
    renderAt('/blog/missing', 'en');
    expect(await screen.findByText(/command not found/i)).toBeInTheDocument();
  });
});
