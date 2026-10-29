import { lazy, Suspense } from 'react';
import LoadingBar from './LoadingBar';

/* Plain class join: `cn` would pull tailwind-merge (~9 kB gzip) into the entry chunk. */
const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

/* ascii-reveal ships as one ~17 kB (gzip) module that does not tree-shake, so it lives in a lazy
   chunk to keep the entry budget. Until the chunk arrives the plain LoadingBar shows instead. */
const AsciiSkeleton = lazy(() => import('ascii-reveal').then((m) => ({ default: m.AsciiSkeleton })));

/**
 * ASCII loading placeholder built on `ascii-reveal`'s `AsciiSkeleton`.
 *
 * The glyph patterns are `aria-hidden`; the wrapper is a `role="status"` region with a
 * visually hidden label, so screen readers still hear "loading…" like with `LoadingBar`.
 * Colours come from `--ascii-skeleton` / `--ascii-accent` set in `index.css`.
 *
 * Layouts mirror the content they stand in for, so nothing jumps when data arrives:
 * - `lines`   — a short paragraph.
 * - `list`    — blog list rows (cover block + title/excerpt lines).
 * - `article` — a blog post (cover, title, meta, body).
 * - `cards`   — project cards in a responsive grid.
 */
export type TermSkeletonLayout = 'lines' | 'list' | 'article' | 'cards';

interface Props {
  label?: string;
  layout?: TermSkeletonLayout;
  /** Number of list rows / cards. */
  count?: number;
  className?: string;
}

export default function TermSkeleton({ label = 'loading...', layout = 'lines', count = 3, className }: Props) {
  return (
    <div role="status" data-testid="term-skeleton" className={cls('term-skeleton font-mono', className)}>
      <span className="sr-only">{label}</span>
      <Suspense fallback={<div aria-hidden="true"><LoadingBar label={label} /></div>}>
        <SkeletonBody layout={layout} count={count} />
      </Suspense>
    </div>
  );
}

function SkeletonBody({ layout, count }: { layout: TermSkeletonLayout; count: number }) {
  if (layout === 'list') {
    return (
      <ul className="mt-6 space-y-5 list-none p-0 m-0">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className="flex gap-3">
            <AsciiSkeleton rows={5} width="7rem" seed={i * 7 + 1} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <AsciiSkeleton lines={1} widths={['70%']} seed={i * 7 + 2} />
              <AsciiSkeleton lines={2} widths={['100%', '55%']} seed={i * 7 + 3} className="mt-2" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (layout === 'article') {
    return (
      <div className="mt-6">
        <AsciiSkeleton rows={10} width="100%" seed={11} />
        <AsciiSkeleton lines={1} widths={['65%']} seed={12} className="mt-6" />
        <AsciiSkeleton lines={1} widths={['30%']} seed={13} className="mt-3" />
        <AsciiSkeleton lines={6} seed={14} className="mt-6" />
      </div>
    );
  }

  if (layout === 'cards') {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={cls(
              'rounded-sm border border-hud-border bg-surface/80 p-4',
              i > 0 && 'hidden sm:block',
              i > 1 && 'sm:hidden lg:block',
            )}
          >
            <AsciiSkeleton lines={1} widths={['60%']} seed={i * 5 + 21} />
            <AsciiSkeleton lines={4} seed={i * 5 + 22} className="mt-4" />
            <AsciiSkeleton lines={1} widths={['40%']} seed={i * 5 + 23} className="mt-6" />
          </div>
        ))}
      </div>
    );
  }

  return <AsciiSkeleton lines={3} />;
}
