import { useState, useRef, useEffect, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { motion, useInView } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Project {
  name: string;
  description: string;
  image: string;
  tags: string[];
  flagship?: boolean;
}

const projects: Project[] = [
  {
    name: 'Kanban Task Management',
    description:
      'Real-time task board with drag & drop, SignalR live updates, Google Calendar sync. Reduced overhead by ~50%.',
    image: '/kanban.png',
    tags: ['Next.js', '.NET 9', 'SignalR', 'PostgreSQL'],
    flagship: true,
  },
  {
    name: 'Context Nexus',
    description:
      'Context management system with advanced search, tagging, and relationship mapping between knowledge nodes.',
    image: '/context-nexus.png',
    tags: ['React', 'TypeScript', 'Node.js'],
  },
  {
    name: 'Domain Viewer',
    description:
      'Interactive domain analysis dashboard with visual tree navigation, DNS inspection, and monitoring alerts.',
    image: '/domain-viewer.png',
    tags: ['Next.js', 'D3.js', 'Tailwind'],
  },
  {
    name: 'Queue Backend',
    description:
      'Robust message queue system with retry logic, dead letter handling, and 80%+ integration test coverage.',
    image: '/queue-backend.png',
    tags: ['.NET 9', 'Testcontainers', 'xUnit'],
  },
  {
    name: 'Real-time Chat',
    description:
      'Socket-based chat template with room management, typing indicators, and message persistence.',
    image: '/realtime-chat.png',
    tags: ['.NET 9', 'SignalR', 'React'],
  },
  {
    name: 'Automation Scripts',
    description:
      'PowerShell CLI toolkit with 8+ commands for context management, environment switching, and interactive mode.',
    image: '/automation-scripts.png',
    tags: ['PowerShell', 'Docker', 'CI/CD'],
  },
];

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
        stroke="#F0EDE4"
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Project Card                                                       */
/* ------------------------------------------------------------------ */

function ProjectCard({
  project,
  index,
  centerIndex,
}: {
  project: Project;
  index: number;
  centerIndex: number;
}) {
  const rotateY = index === centerIndex ? 0 : index < centerIndex ? 8 : -8;

  return (
    <motion.div
      className="shrink-0"
      style={{
        width: CARD_WIDTH,
        height: 480,
        perspective: 1200,
      }}
      initial={{
        opacity: 0,
        x: index < centerIndex ? -80 : index > centerIndex ? 80 : 0,
        rotateY: index === centerIndex ? -15 : index < centerIndex ? -20 : 20,
      }}
      animate={{
        opacity: 1,
        x: 0,
        rotateY,
      }}
      transition={{
        duration: 0.6,
        delay: Math.abs(index - centerIndex) * 0.1,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
    >
      <div
        className="group relative h-full w-full overflow-hidden rounded-lg transition-all ease-out md:hover:-translate-y-2"
        style={{
          transitionDuration: '350ms',
          backgroundColor: '#1A1A2E',
          border: '2px solid rgba(108, 92, 231, 0.25)',
          transformStyle: 'preserve-3d',
        }}
        onMouseEnter={(e: MouseEvent<HTMLDivElement>) => {
          const el = e.currentTarget;
          el.style.borderColor = '#6C5CE7';
          el.style.boxShadow = '0 20px 40px rgba(108, 92, 231, 0.2)';
          if (window.innerWidth >= 768) {
            el.style.transform = 'translateY(-8px) translateZ(40px)';
          }
        }}
        onMouseLeave={(e: MouseEvent<HTMLDivElement>) => {
          const el = e.currentTarget;
          el.style.borderColor = 'rgba(108, 92, 231, 0.25)';
          el.style.boxShadow = 'none';
          el.style.transform = `rotateY(${rotateY}deg)`;
        }}
      >
        {/* Top half — image */}
        <div className="relative h-[180px] w-full overflow-hidden" style={{ borderRadius: '8px 8px 0 0' }}>
          <img
            src={project.image}
            alt={project.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {project.flagship && (
            <span
              className="absolute left-3 top-3 px-3 py-1 font-mono-labels text-[12px] uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(108, 92, 231, 0.9)',
                color: '#F0EDE4',
                borderRadius: 4,
              }}
            >
              FLAGSHIP
            </span>
          )}
        </div>

        {/* Bottom half — content */}
        <div className="flex flex-col" style={{ padding: 28 }}>
          <h3
            className="font-pixel text-[16px] leading-tight"
            style={{ color: '#F0EDE4' }}
          >
            {project.name}
          </h3>

          <p
            className="mt-2 font-body text-[15px] leading-relaxed line-clamp-2"
            style={{ color: '#8A8598' }}
          >
            {project.description}
          </p>

          {/* Tech tags */}
          <div className="mt-4 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono-labels text-[14px]"
                style={{
                  backgroundColor: 'rgba(108, 92, 231, 0.15)',
                  color: '#6C5CE7',
                  padding: '4px 12px',
                  borderRadius: 4,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* View Project link */}
          <a
            href="#"
            className="group/link mt-5 inline-flex items-center gap-1 font-mono-labels text-[16px] transition-colors duration-200"
            style={{ color: '#00E5FF' }}
            onClick={(e) => e.preventDefault()}
          >
            View Project
            <motion.span
              className="inline-block"
              initial={false}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="#00E5FF"
                  strokeWidth="2.5"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
            </motion.span>
          </a>
        </div>
      </div>
    </motion.div>
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
      className="relative w-full overflow-hidden"
      style={{
        padding: '120px 0',
        backgroundColor: '#0A0A12',
      }}
    >
      {/* Section header */}
      <div className="mx-auto max-w-6xl px-6 md:px-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <span
            className="font-pixel text-[14px]"
            style={{ color: '#00E5FF' }}
          >
            {'//'} WORK
          </span>
        </motion.div>

        <motion.h2
          className="font-pixel text-[24px] md:text-[36px] mt-4"
          style={{ color: '#F0EDE4', lineHeight: 1.2 }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          FEATURED PROJECTS
        </motion.h2>

        <motion.p
          className="font-body text-[18px] mt-4"
          style={{ color: '#8A8598' }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          A selection of production tools and systems I&apos;ve built solo.
        </motion.p>
      </div>

      {/* Carousel container */}
      <motion.div
        className="relative mx-auto mt-16 max-w-full"
        style={{ perspective: 1200 }}
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
            className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all duration-200"
            style={{
              width: 48,
              height: 48,
              border: '2px solid #8A8598',
              backgroundColor: 'transparent',
              opacity: canScrollLeft ? 1 : 0.3,
              pointerEvents: canScrollLeft ? 'auto' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00E5FF';
              e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#8A8598';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Scroll left"
          >
            <ArrowIcon direction="left" />
          </button>

          {/* Right arrow */}
          <button
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all duration-200"
            style={{
              width: 48,
              height: 48,
              border: '2px solid #8A8598',
              backgroundColor: 'transparent',
              opacity: canScrollRight ? 1 : 0.3,
              pointerEvents: canScrollRight ? 'auto' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00E5FF';
              e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#8A8598';
              e.currentTarget.style.backgroundColor = 'transparent';
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
            transformStyle: 'preserve-3d',
            scrollbarWidth: 'none',
          }}
        >
          {projects.map((project, i) => (
            <ProjectCard
              key={project.name}
              project={project}
              index={i}
              centerIndex={centerIndex}
            />
          ))}
        </div>

        {/* Mobile: stacked cards */}
        <div className="flex md:hidden flex-col gap-6 px-6 mt-8">
          {projects.map((project, i) => (
            <motion.div
              key={project.name}
              className="w-full rounded-lg overflow-hidden"
              style={{
                backgroundColor: '#1A1A2E',
                border: '2px solid rgba(108, 92, 231, 0.25)',
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.5,
                delay: 0.2 + i * 0.1,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              whileHover={{ borderColor: '#6C5CE7' }}
            >
              {/* Mobile image */}
              <div className="relative h-[180px] w-full" style={{ borderRadius: '8px 8px 0 0' }}>
                <img
                  src={project.image}
                  alt={project.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {project.flagship && (
                  <span
                    className="absolute left-3 top-3 px-3 py-1 font-mono-labels text-[12px] uppercase tracking-wider"
                    style={{
                      backgroundColor: 'rgba(108, 92, 231, 0.9)',
                      color: '#F0EDE4',
                      borderRadius: 4,
                    }}
                  >
                    FLAGSHIP
                  </span>
                )}
              </div>

              {/* Mobile content */}
              <div style={{ padding: 20 }}>
                <h3 className="font-pixel text-[14px]" style={{ color: '#F0EDE4' }}>
                  {project.name}
                </h3>
                <p
                  className="mt-2 font-body text-[14px] line-clamp-2"
                  style={{ color: '#8A8598' }}
                >
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono-labels text-[13px]"
                      style={{
                        backgroundColor: 'rgba(108, 92, 231, 0.15)',
                        color: '#6C5CE7',
                        padding: '3px 10px',
                        borderRadius: 4,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <a
                  href="#"
                  className="mt-3 inline-flex items-center gap-1 font-mono-labels text-[15px]"
                  style={{ color: '#00E5FF' }}
                  onClick={(e) => e.preventDefault()}
                >
                  View Project →
                </a>
              </div>
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
