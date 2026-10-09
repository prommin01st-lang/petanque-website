import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { pick } from '@/lib/pick';
import type { Project } from '@/lib/types';
import { TerminalWindow, ErrorLine, LoadingBar } from '@/components/term';
import { useI18n } from '@/i18n/I18nContext';
import SectionHeading from './SectionHeading';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_WIDTH = 380;
const CARD_GAP = 24;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;
const CARD_HEIGHT = 360;
/* Align the first card with the max-w-6xl content column */
const TRACK_PAD = 'max(40px, calc((100% - 1152px) / 2))';
const smoothEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  ASCII project card                                                 */
/* ------------------------------------------------------------------ */

function ProjectCard({
  project,
  fixedHeight,
}: {
  project: Project;
  fixedHeight: boolean;
}) {
  const { t, lang } = useI18n();

  return (
    <div className="h-full pt-1" style={fixedHeight ? { height: CARD_HEIGHT } : undefined}>
      <TerminalWindow title={`~/projects/${project.slug}`} as="article" className="term-window-fill h-full">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-mono font-bold text-[15px] text-text leading-snug min-w-0">
            {pick(project.name, lang)}
          </h3>
          {project.flagship && (
            <span className="font-mono text-[12px] text-warn whitespace-nowrap shrink-0">
              {`[★ ${t.projects.flagship}]`}
            </span>
          )}
        </div>

        <p className="mt-3 font-body text-[13.5px] font-light leading-relaxed text-text-dim line-clamp-4">
          {pick(project.description, lang)}
        </p>

        {project.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-1 list-none p-0 m-0">
            {project.tags.map((tag) => (
              <li key={tag} className="term-tag">{`[${tag}]`}</li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-4">
          <div className="pt-3 border-t border-dashed border-hud-border font-mono text-[12px] space-y-2">
            {project.metric && (
              <p className="text-warn break-words">{`>> ${project.metric}`}</p>
            )}
            {(project.repoUrl || project.demoUrl) && (
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="link-neon">
                    {`[ ${t.projects.source} ↗ ]`}
                  </a>
                )}
                {project.demoUrl && (
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="link-neon">
                    {`[ ${t.projects.demo} ↗ ]`}
                  </a>
                )}
              </p>
            )}
          </div>
        </div>
      </TerminalWindow>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                       */
/* ------------------------------------------------------------------ */

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { t } = useI18n();

  const { data, error, isPending, refetch } = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const projects = data?.items ?? [];

  const centerIndex = Math.floor(projects.length / 2);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [checkScroll, projects.length]);

  const scrollBy = useCallback((direction: -1 | 1) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: 'smooth',
    });
  }, []);

  const arrowClass =
    'font-mono text-[13px] px-2 py-1 border border-hud-border bg-surface/90 text-ansi-bright-cyan transition-colors duration-200 hover:border-ansi-bright-cyan disabled:opacity-30 disabled:hover:border-hud-border';

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative w-full overflow-hidden py-20 pointer-events-none"
    >
      {/* Section header */}
      <div className="px-4 sm:px-6 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-6">
            <SectionHeading command="ls ~/projects" title={t.projects.title} />
            {projects.length > 0 && (
              <div className="hidden md:flex gap-2 mb-10 shrink-0 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  disabled={!canScrollLeft}
                  className={arrowClass}
                  aria-label={t.projects.scrollLeft}
                >
                  [ &lt; ]
                </button>
                <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  disabled={!canScrollRight}
                  className={arrowClass}
                  aria-label={t.projects.scrollRight}
                >
                  [ &gt; ]
                </button>
              </div>
            )}
          </div>
          <p className="-mt-4 mb-8 font-body text-[15px] font-light text-text-dim max-w-2xl">
            {t.projects.subtitle}
          </p>
        </div>
      </div>

      {(isPending || error || projects.length === 0) && (
        <div className="px-4 sm:px-6 md:px-10">
          <div className="mx-auto max-w-6xl pointer-events-auto">
            {isPending ? (
              <LoadingBar label={t.common.loading} />
            ) : error ? (
              <ErrorLine error={error} onRetry={() => void refetch()} retryLabel={t.common.retry} fallbackMessage={t.common.error} />
            ) : (
              <p className="font-mono text-sm text-text-dim">{t.common.empty}</p>
            )}
          </div>
        </div>
      )}

      {/* Carousel container */}
      <motion.div
        className="relative mx-auto max-w-full pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Cards scroll track - desktop */}
        <div
          ref={scrollContainerRef}
          className="hidden md:flex overflow-x-auto scrollbar-hide py-4"
          style={{
            gap: CARD_GAP,
            paddingLeft: TRACK_PAD,
            paddingRight: TRACK_PAD,
            scrollPaddingLeft: TRACK_PAD,
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
          }}
        >
          {projects.map((project, i) => (
            <motion.div
              key={project.slug}
              className="shrink-0"
              style={{ width: CARD_WIDTH }}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: Math.abs(i - centerIndex) * 0.05,
                ease: smoothEase,
              }}
            >
              <ProjectCard project={project} fixedHeight />
            </motion.div>
          ))}
        </div>

        {/* Mobile: stacked cards */}
        <div className="flex md:hidden flex-col gap-8 px-4 sm:px-6 pt-2">
          {projects.map((project, i) => (
            <motion.div
              key={project.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.1 + i * 0.05,
                ease: smoothEase,
              }}
            >
              <ProjectCard project={project} fixedHeight={false} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Hide scrollbar CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
