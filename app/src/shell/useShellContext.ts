import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/i18n/I18nContext';
import { goToSection } from '@/hooks/useActiveSection';
import { api, ApiError } from '@/lib/api';
import type { Paged, Post, PostSummary } from '@/lib/types';
import type { ShellContext, ShellData } from './types';
import { classifyUrl } from './safeUrl';

export interface ShellState {
  cwd: string;
  setCwd(path: string): void;
  history: readonly string[];
  clear(): void;
  close(): void;
}

const PER_PAGE = 50;

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
const retry = (n: number, err: unknown) =>
  !isAbort(err) && !(err instanceof ApiError && err.status >= 400 && err.status < 500) && n < 2;

/** Aborts the wait, never the underlying (shared) query. Resolves with `p`, or rejects with an AbortError as soon as `signal` aborts. */
function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

/**
 * Builds the shell's command context (minus the per-command `signal`).
 * Data reads go through the page's React Query cache with the page's keys,
 * so the shell and the sections share fetched data.
 */
export function useShellContext(state: ShellState): Omit<ShellContext, 'signal'> {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const qc = useQueryClient();

  const data = useMemo<ShellData>(
    () => ({
      async projects(signal) {
        const res = await abortable(
          qc.fetchQuery({ queryKey: ['projects'], queryFn: () => api.projects(), retry }),
          signal,
        );
        return res.items;
      },
      async posts(signal) {
        const all: PostSummary[] = [];
        for (let page = 1; ; page++) {
          const res: Paged<PostSummary> = await abortable(
            qc.fetchQuery({
              queryKey: ['posts', { page, perPage: PER_PAGE }],
              queryFn: () => api.posts({ page, perPage: PER_PAGE }),
              retry,
            }),
            signal,
          );
          all.push(...res.items);
          if (page * res.perPage >= res.total || res.items.length === 0) return all;
        }
      },
      async post(slug, signal) {
        try {
          return await abortable(
            qc.fetchQuery<Post>({ queryKey: ['post', slug], queryFn: () => api.post(slug), retry }),
            signal,
          );
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        }
      },
    }),
    [qc],
  );

  const { cwd, setCwd, history, clear, close } = state;
  return useMemo<Omit<ShellContext, 'signal'>>(
    () => ({
      // SHELL_THAI=ok: the shell follows the site language.
      t,
      lang,
      cwd,
      history,
      data,
      setCwd,
      setLang,
      goSection: (id) => goToSection(id, navigate, pathname),
      navigate: (path) => navigate(path),
      openExternal: (url) => {
        const c = classifyUrl(url);
        if (c.kind === 'external') window.open(c.url, '_blank', 'noopener');
      },
      clear,
      close,
    }),
    [t, lang, cwd, history, data, setCwd, setLang, navigate, pathname, clear, close],
  );
}

