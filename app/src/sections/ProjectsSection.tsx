import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  metric?: string;
  flagship?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CARD_WIDTH = 380;
const CARD_GAP = 24;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;

/* ------------------------------------------------------------------ */
/*  Arrow SVG icon                                                     */
/* ------------------------------------------------------------------ */

function ArrowIcon({ direction = 'left' }: { direction?: 'left' | 'right' }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: direction === 'right' ? 'scaleX(-1)' : undefined }}
    >
      <path
        d="M15 19l-7-7 7-7"
        stroke="#D7E3F0"
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function GitHubMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.48v-1.7C6.73 20.4 5.8 18.4 5.8 18.4s-.75-1.9-1.84-2.4c0 0-1.5-1.03.1-1.01 0 0 1.64.13 2.54 1.7 1.44 2.53 3.85 1.8 4.79 1.37.15-1.05.58-1.8 1.05-2.23-3.68-.42-7.55-1.84-7.55-8.18 0-1.81.64-3.28 1.7-4.44-.17-.42-.74-2.1.16-4.37 1.35-.42 4.46 1.69 4.46 1.69a15.3 15.3 0 0 1 8.02 0s3.11-2.11 4.46-1.69c.9 2.27.33 3.95.16 4.37 1.05 1.16 1.7 2.63 1.7 4.44 0 6.36-3.88 7.75-7.57 8.17.6.52 1.12 1.54 1.12 3.1v4.57c0 .36.18.69.68.57C19.14 20.6 22 16.76 22 12.26 22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Terminal-window project card                                       */
/* ------------------------------------------------------------------ */

function ProjectTerminalCard({
  project,
  fixedHeight,
}: {
  project: Project;
  fixedHeight: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      className="term-window flex flex-col w-full"
      style={fixedHeight ? { height: 430 } : undefined}
    >
      {/* Title bar */}
      <div className="term-window-header">
        <span className="term-dot term-dot-red" />
        <span className="term-dot term-dot-amber" />
        <span className="term-dot term-dot-green" />
        <span className="ml-2 truncate">~/projects/{project.id}</span>
        {project.flagship && (
          <span className="chip chip-green ml-auto shrink-0">{t.projects.flagship}</span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-mono font-bold text-[15px] text-text leading-snug">
          {project.name}
        </h3>

        <p className="mt-2.5 font-body text-[13.5px] font-light leading-relaxed text-text-dim line-clamp-4">
          {project.description}
        </p>

        {/* Tech tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>

        {/* Footer: metric + repo link */}
        <div
          className="mt-auto pt-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(30, 42, 56, 0.7)', marginTop: 'auto' }}
        >
          <span className="font-mono text-[11px] text-terminal-green truncate">
            {project.metric ? `▸ ${project.metric}` : ''}
          </span>
          <a
            href="https://github.com/prommin01st-lang"
            target="_blank"
            rel="noopener noreferrer"
            className="link-neon font-mono text-[12px] inline-flex items-center gap-1.5 shrink-0"
          >
            <GitHubMark />
            GitHub
          </a>
        </div>
      </div>
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

  const projects: Project[] = [
    {
      id: 'kanban',
      name: t.projects.items.kanban.name,
      description: t.projects.items.kanban.description,
      tags: ['Next.js', '.NET 10', 'SignalR', 'PostgreSQL'],
      metric: '~50% overhead · 8h→2h/wk',
      flagship: true,
    },
    {
      id: 'domain-viewer',
      name: t.projects.items.domainViewer.name,
      description: t.projects.items.domainViewer.description,
      tags: ['Next.js 16', '.NET 10', 'Quartz.NET', 'Tailwind 4'],
      metric: 'JWT dual-token · Quartz jobs',
    },
    {
      id: 'queue-backend',
      name: t.projects.items.queueBackend.name,
      description: t.projects.items.queueBackend.description,
      tags: ['.NET 10', 'Redis', 'Testcontainers', 'xUnit'],
      metric: '80%+ test coverage',
    },
    {
      id: 'realtime-chat',
      name: t.projects.items.realtimeChat.name,
      description: t.projects.items.realtimeChat.description,
      tags: ['.NET 10', 'SignalR', 'JWT'],
      metric: 'reusable template',
    },
    {
      id: 'contextgate',
      name: t.projects.items.contextgate.name,
      description: t.projects.items.contextgate.description,
      tags: ['TypeScript', 'Hono', 'Drizzle', 'MCP'],
      metric: 'default-deny policies',
    },
    {
      id: 'context-nexus',
      name: t.projects.items.contextNexus.name,
      description: t.projects.items.contextNexus.description,
      tags: ['REST API', 'PostgreSQL', 'GitHub Sync'],
      metric: 'x-api-key auth',
    },
    {
      id: 'mcp-control-tower',
      name: t.projects.items.mcpControlTower.name,
      description: t.projects.items.mcpControlTower.description,
      tags: ['VS Code Ext', 'TypeScript', 'React 18', 'Zustand'],
      metric: '<500ms activation',
    },
    {
      id: 'automation-scripts',
      name: t.projects.items.automationScripts.name,
      description: t.projects.items.automationScripts.description,
      tags: ['PowerShell 7+', 'CLI'],
      metric: '8+ nx-* commands',
    },
    {
      id: 'iron-coach-th',
      name: t.projects.items.ironCoachTh.name,
      description: t.projects.items.ironCoachTh.description,
      tags: ['QLoRA', 'Qwen2.5', 'Thai NLP'],
      metric: '76% PASS (base ~45%)',
    },
    {
      id: 'sarabun-ocr',
      name: t.projects.items.sarabunOcr.name,
      description: t.projects.items.sarabunOcr.description,
      tags: ['Python', 'Ollama', 'PaddleOCR', 'ChromaDB'],
      metric: 'offline · 8GB RAM',
    },
    {
      id: 'flow-forge',
      name: t.projects.items.flowForge.name,
      description: t.projects.items.flowForge.description,
      tags: ['React', 'Mermaid.js', 'QLoRA', 'Qwen2.5'],
      metric: '8 diagram types · Thai prompt',
    },
  ];

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
  }, [checkScroll]);

  const scrollBy = useCallback((direction: -1 | 1) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: 'smooth',
    });
  }, []);

  return (
    <section
      id="projects"
      ref={sectionRef}
      className="relative w-full overflow-hidden pointer-events-none"
      style={{ padding: '120px 0' }}
    >
      {/* Section header */}
      <div className="mx-auto max-w-6xl px-6 md:px-20 text-center pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span className="font-mono text-[13px] text-neon-cyan">
            {t.projects.sectionLabel}
          </span>
        </motion.div>

        <motion.h2
          className="font-mono font-bold text-[28px] md:text-[36px] mt-3 text-text text-glow-cyan"
          style={{ lineHeight: 1.2 }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t.projects.title}
        </motion.h2>

        <motion.p
          className="font-body text-[16px] font-light mt-4 text-text-dim"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {t.projects.subtitle}
        </motion.p>
      </div>

      {/* Carousel container */}
      <motion.div
        className="relative mx-auto mt-16 max-w-full pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        {/* Navigation arrows - desktop only */}
        <div className="hidden md:block">
          {/* Left arrow */}
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-md transition-all duration-200"
            style={{
              width: 48,
              height: 48,
              border: '1px solid #1E2A38',
              backgroundColor: 'rgba(10, 16, 24, 0.85)',
              opacity: canScrollLeft ? 1 : 0.3,
              pointerEvents: canScrollLeft ? 'auto' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00E5FF';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 229, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1E2A38';
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-label="Scroll left"
          >
            <ArrowIcon direction="left" />
          </button>

          {/* Right arrow */}
          <button
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-md transition-all duration-200"
            style={{
              width: 48,
              height: 48,
              border: '1px solid #1E2A38',
              backgroundColor: 'rgba(10, 16, 24, 0.85)',
              opacity: canScrollRight ? 1 : 0.3,
              pointerEvents: canScrollRight ? 'auto' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00E5FF';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 229, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1E2A38';
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-label="Scroll right"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>

        {/* Cards scroll track - desktop */}
        <div
          ref={scrollContainerRef}
          className="hidden md:flex overflow-x-auto scrollbar-hide"
          style={{
            gap: CARD_GAP,
            paddingLeft: 'max(48px, calc((100% - 1200px) / 2 + 48px))',
            paddingRight: 'max(48px, calc((100% - 1200px) / 2 + 48px))',
            scrollPaddingLeft: 'max(48px, calc((100% - 1200px) / 2 + 48px))',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
          }}
        >
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              className="shrink-0"
              style={{ width: CARD_WIDTH }}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: Math.abs(i - centerIndex) * 0.06,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
            >
              <ProjectTerminalCard project={project} fixedHeight />
            </motion.div>
          ))}
        </div>

        {/* Mobile: stacked cards */}
        <div className="flex md:hidden flex-col gap-6 px-6 mt-8">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.1 + i * 0.06,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
            >
              <ProjectTerminalCard project={project} fixedHeight={false} />
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
