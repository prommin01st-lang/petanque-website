import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { pick } from '@/lib/pick';
import { useI18n } from '@/i18n/I18nContext';
import { AsciiBox } from '@/components/term';
import SectionHeading from './SectionHeading';

export default function LatestPostsSection() {
  const { t, lang } = useI18n();
  const { data } = useQuery({
    queryKey: ['posts', { page: 1, perPage: 3 }],
    queryFn: () => api.posts({ perPage: 3 }),
  });

  if (!data || data.items.length === 0) return null;

  return (
    <section id="blog" className="relative w-full py-20 px-4 sm:px-6 md:px-10 pointer-events-none">
      <div className="mx-auto max-w-6xl">
        <SectionHeading command="ls -t ~/blog | head -3" title={t.blog.latest} />
        <AsciiBox title="~/blog" className="max-w-3xl">
          <ul className="list-none p-0 m-0 px-1 py-2 space-y-5 font-mono">
            {data.items.map((p) => (
              <li key={p.slug}>
                <Link to={`/blog/${p.slug}`} className="group flex flex-wrap gap-x-3">
                  <span className="text-warn text-[13px] whitespace-nowrap">
                    {new Date(p.publishedAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB')}
                  </span>
                  <span className="text-text group-hover:text-ansi-bright-cyan min-w-0 break-words">{pick(p.title, lang)}</span>
                </Link>
                {pick(p.excerpt, lang) && (
                  <p className="mt-1 font-body text-[13.5px] text-text-dim">{pick(p.excerpt, lang)}</p>
                )}
              </li>
            ))}
          </ul>
          <Link to="/blog" className="link-neon inline-block mt-4 px-1 font-mono text-[13px]">
            {`[ ${t.blog.allPosts} → ]`}
          </Link>
        </AsciiBox>
      </div>
    </section>
  );
}
