import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { pick } from '@/lib/pick';
import { readMinutes } from '@/lib/readTime';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useI18n } from '@/i18n/I18nContext';
import Markdown from '@/components/Markdown';
import AsciiImage from '@/components/AsciiImage';
import { AsciiBox, ErrorLine, LoadingBar, Prompt } from '@/components/term';
import { NotFoundContent } from './NotFoundPage';

export default function BlogPostPage() {
  const { slug = '' } = useParams();
  const { t, lang } = useI18n();
  const { data: post, error, isPending, refetch } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => api.post(slug),
    retry: (n, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && n < 2,
  });
  useDocumentTitle(post ? pick(post.title, lang) : '');

  if (error instanceof ApiError && error.status === 404) return <NotFoundContent />;

  const body = post ? pick(post.body, lang) : '';
  const minutes = readMinutes(body);

  return (
    <section className="min-h-[100dvh] px-4 sm:px-6 pt-24 pb-20 pointer-events-none">
      <AsciiBox title={`~/blog/${slug}.md`} className="mx-auto max-w-3xl">
        <div className="px-1 py-2 md:px-4 md:py-4 font-mono space-y-3 min-w-0 [overflow-wrap:anywhere]">
          <Prompt command={`cat ~/blog/${slug}.md`} />
          {isPending && <LoadingBar label={t.common.loading} />}
          {error && !isPending && (
            <ErrorLine error={error} onRetry={() => void refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
          )}
          {post && (
            <article className="mt-6">
              {post.coverUrl && (
                <AsciiImage
                  src={post.coverUrl}
                  alt={pick(post.title, lang)}
                  cols={80}
                  className="mb-6 border border-hud-border"
                />
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-text">{pick(post.title, lang)}</h1>
              <p className="mt-2 text-[13px] text-text-dim">
                <time className="text-warn" dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB')}
                </time>
                {' · '}
                {minutes} {t.blog.minRead}
              </p>
              {post.tags.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1 list-none p-0 m-0">
                  {post.tags.map((tag) => (
                    <li key={tag} className="term-tag">{`[${tag}]`}</li>
                  ))}
                </ul>
              )}
              {lang === 'th' && !post.body.th && (
                <p className="mt-4 text-[13px] text-warn">{t.blog.notTranslated}</p>
              )}
              <div className="mt-6 font-body">
                <Markdown source={body} />
              </div>
              <Link to="/blog" className="link-neon inline-block mt-8">
                {`[ ← ${t.common.back} ]`}
              </Link>
            </article>
          )}
        </div>
      </AsciiBox>
    </section>
  );
}
