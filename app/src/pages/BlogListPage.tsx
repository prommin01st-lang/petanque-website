import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { pick } from '@/lib/pick';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useI18n } from '@/i18n/I18nContext';
import { TerminalWindow, ErrorLine, LoadingBar, Prompt } from '@/components/term';
import AsciiImage from '@/components/AsciiImage';

const PER_PAGE = 10;

export default function BlogListPage() {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page'));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const tag = params.get('tag') ?? '';
  useDocumentTitle(t.blog.title);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['posts', { page, perPage: PER_PAGE, tag }],
    queryFn: () => api.posts({ page, perPage: PER_PAGE, tag: tag || undefined }),
  });

  const go = (next: { page?: number; tag?: string }) => {
    const p = new URLSearchParams();
    const nt = next.tag ?? tag;
    if (nt) p.set('tag', nt);
    if (next.page && next.page > 1) p.set('page', String(next.page));
    setParams(p);
  };

  const tags = data ? Array.from(new Set(data.items.flatMap((p) => p.tags))) : [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1;

  /* A stale/hand-edited ?page beyond the end: jump to the last page without adding history. */
  const overshoot = data !== undefined && page > totalPages;
  useEffect(() => {
    if (!overshoot) return;
    const p = new URLSearchParams();
    if (tag) p.set('tag', tag);
    if (totalPages > 1) p.set('page', String(totalPages));
    setParams(p, { replace: true });
  }, [overshoot, tag, totalPages, setParams]);

  return (
    <section className="min-h-[100dvh] px-4 sm:px-6 pt-24 pb-20 pointer-events-none">
      <TerminalWindow title="~/blog" className="mx-auto max-w-3xl">
        <div className="px-1 py-2 md:px-3 md:py-3 font-mono space-y-3">
          <h1 className="sr-only">{t.blog.title}</h1>
          <Prompt command="ls -la ~/blog" />
          {isPending && <LoadingBar label={t.common.loading} />}
          {error && !isPending && (
            <ErrorLine error={error} onRetry={() => void refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
          )}
          {data && (
            <>
              <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
                <button type="button" onClick={() => go({ page: 1, tag: '' })} aria-pressed={!tag} className={tag ? 'link-neon' : 'text-ansi-bright-green'}>
                  [{t.blog.filterAll}]
                </button>
                {tags.map((tg) => (
                  <button key={tg} type="button" onClick={() => go({ page: 1, tag: tg })} aria-pressed={tag === tg} className={tag === tg ? 'text-ansi-bright-green' : 'link-neon'}>
                    [{tg}]
                  </button>
                ))}
              </div>
              {data.items.length === 0 ? (
                <p className="mt-6 text-text-dim">
                  <span className="text-text-dim">total 0</span>
                  <br />
                  {t.blog.empty}
                </p>
              ) : (
                <ul className="mt-6 space-y-5 list-none p-0">
                  {data.items.map((p) => (
                    <li key={p.slug} className="flex gap-3">
                      {p.coverUrl && (
                        <AsciiImage
                          src={p.coverUrl}
                          alt=""
                          cols={40}
                          interactive={false}
                          className="w-28 shrink-0 self-start border border-hud-border"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link to={`/blog/${p.slug}`} className="group flex flex-wrap gap-x-3">
                          <span className="text-warn text-[13px]">
                            {new Date(p.publishedAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB')}
                          </span>
                          <span className="text-text group-hover:text-ansi-bright-cyan min-w-0 break-words">{pick(p.title, lang)}</span>
                          {p.tags.length > 0 && <span className="text-tag text-[12px] self-center">[{p.tags.join(', ')}]</span>}
                        </Link>
                        {pick(p.excerpt, lang) && (
                          <p className="mt-1 font-body text-[13.5px] text-text-dim">{pick(p.excerpt, lang)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {totalPages > 1 && (
                <nav className="mt-8 flex items-center gap-4 text-[13px]" aria-label={t.blog.page}>
                  <button type="button" disabled={page <= 1} onClick={() => go({ page: page - 1 })} className="link-neon disabled:opacity-40">
                    [{t.blog.prev}]
                  </button>
                  <span className="text-text-dim">{t.blog.page} {page}/{totalPages}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => go({ page: page + 1 })} className="link-neon disabled:opacity-40">
                    [{t.blog.next}]
                  </button>
                </nav>
              )}
            </>
          )}
          <Link to="/" className="link-neon inline-block mt-8">{`[ ← ${t.common.back} ]`}</Link>
        </div>
      </TerminalWindow>
    </section>
  );
}
