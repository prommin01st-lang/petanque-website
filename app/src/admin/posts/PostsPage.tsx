import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorLine, LoadingBar } from '@/components/term';
import { api } from '@/lib/api';
import type { PostStatus } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';
import { fmtLocal } from '../time';

type Filter = 'all' | PostStatus;
const FILTERS: Filter[] = ['all', 'draft', 'published'];

/** "2026-10-09T12:34:56.000Z" → "2026-10-09 12:34" (server timestamps are fixed-width UTC). */
const shortTime = (ts: string) => ts.slice(0, 16).replace('T', ' ');

export default function PostsPage() {
  const { t, lang } = useI18n();
  const p = t.admin.posts;
  const [filter, setFilter] = useState<Filter>('all');
  const status = filter === 'all' ? undefined : filter;
  const q = useQuery({ queryKey: ['admin', 'posts', status], queryFn: () => api.admin.posts(status) });

  return (
    <div className="flex flex-col gap-4 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-lg text-ansi-bright-cyan">{p.title}</h1>
        <Link to="/admin/posts/new" className="btn-neon">{p.new}</Link>
      </div>
      <div role="group" aria-label={p.filter.label} className="flex gap-3 text-sm">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={filter === f ? 'text-ansi-bright-cyan' : 'text-text-dim hover:text-text'}
          >
            {p.filter[f]}
          </button>
        ))}
      </div>
      {q.isPending && <LoadingBar label={t.common.loading} />}
      {q.isError && (
        <ErrorLine error={q.error} onRetry={() => q.refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
      )}
      {q.data && q.data.items.length === 0 && <p className="text-sm text-text-dim">{p.empty}</p>}
      {q.data && q.data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-dim">
                <th>{p.cols.updated}</th>
                <th>{p.cols.slug}</th>
                <th>{p.cols.title}</th>
                <th>{p.cols.status}</th>
                <th>{p.cols.published}</th>
                <th>{p.cols.tags}</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((post) => (
                <tr key={post.id} className="border-t border-hud-border">
                  <td className="whitespace-nowrap text-text-dim">{shortTime(post.updatedAt)}</td>
                  <td>
                    <Link to={`/admin/posts/${post.id}`} className="link-neon">{post.slug}</Link>
                  </td>
                  <td>{post.titleEn || post.titleTh}</td>
                  <td className={post.status === 'published' ? 'text-ansi-bright-green' : 'text-text-dim'}>{p.status[post.status]}</td>
                  <td className="whitespace-nowrap text-text-dim">
                    {post.publishedAt ? fmtLocal(post.publishedAt, lang) : p.neverPublished}
                  </td>
                  <td className="text-text-dim">{post.tags.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
