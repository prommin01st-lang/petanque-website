import { useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';

const smoothEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  DATA — Focus Areas                                                 */
/* ------------------------------------------------------------------ */

interface FocusArea {
  title: string;
  description: string;
  command: string;
  icon: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  ICONS                                                              */
/* ------------------------------------------------------------------ */

function SignalIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="4" fill="#00E5FF" />
      <path d="M20 4v8M20 28v8M4 20h8M28 20h8M10 10l4 4M26 26l4 4M10 30l4-4M26 14l4-4" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="16" width="14" height="20" rx="2" stroke="#00E5FF" strokeWidth="2" />
      <rect x="22" y="4" width="14" height="32" rx="2" stroke="#00E5FF" strokeWidth="2" />
      <line x1="11" y1="22" x2="11" y2="30" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
      <line x1="29" y1="10" x2="29" y2="30" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloudAiIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 32a8 8 0 0 1-2-15.54A10 10 0 0 1 30 14a8 8 0 0 1-2 18z" stroke="#00E5FF" strokeWidth="2" fill="none" />
      <circle cx="26" cy="12" r="2" fill="#00E5FF" />
      <circle cx="32" cy="8" r="1.5" fill="#00E5FF" />
      <circle cx="30" cy="14" r="1" fill="#00E5FF" />
      <path d="M18 22l2 2 4-4" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  TILT CARD COMPONENT                                                */
/* ------------------------------------------------------------------ */

function TiltFocusCard({ area, index }: { area: FocusArea; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const mouseX = e.clientX - (rect.left + rect.width / 2);
    const mouseY = e.clientY - (rect.top + rect.height / 2);

    const rotateY = (mouseX / (rect.width / 2)) * 8;
    const rotateX = -(mouseY / (rect.height / 2)) * 8;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: smoothEase }}
      style={{ perspective: '900px' }}
      className="pointer-events-auto"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="panel-hud"
        style={{
          width: '260px',
          minHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '26px 24px',
          transition: 'border-color 0.3s ease, transform 0.15s ease-out',
          willChange: 'transform',
          cursor: 'default',
        }}
      >
        {/* Command line */}
        <span className="font-mono text-[11px] text-text-dim mb-4">
          <span className="text-terminal-green">$</span> {area.command}
        </span>

        {/* Icon */}
        <div className="mb-4">{area.icon}</div>

        {/* Title */}
        <span className="font-mono font-bold text-[15px] text-text mb-2.5 leading-snug">
          {area.title}
        </span>

        {/* Description */}
        <span className="font-body text-[14px] font-light text-text-dim leading-relaxed">
          {area.description}
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN SECTION                                                       */
/* ------------------------------------------------------------------ */

export default function StatsSection() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const focusAreas: FocusArea[] = [
    {
      title: t.stats.areas.realtime.title,
      description: t.stats.areas.realtime.description,
      command: 'ping --realtime',
      icon: <SignalIcon />,
    },
    {
      title: t.stats.areas.fullstack.title,
      description: t.stats.areas.fullstack.description,
      command: 'dotnet run --full-stack',
      icon: <StackIcon />,
    },
    {
      title: t.stats.areas.cloudAi.title,
      description: t.stats.areas.cloudAi.description,
      command: 'deploy --cloud --ai',
      icon: <CloudAiIcon />,
    },
  ];

  return (
    <section
      id="stats"
      ref={sectionRef}
      className="pointer-events-none"
      style={{ padding: '100px 24px' }}
    >
      {/* Section Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.5, ease: smoothEase }}
        className="text-center mb-16"
      >
        <span className="font-mono text-[13px] text-neon-cyan block mb-3">
          {t.stats.sectionLabel}
        </span>
        <h2 className="font-mono font-bold text-[28px] md:text-[36px] text-text leading-tight text-glow-cyan">
          {t.stats.title}
        </h2>
      </motion.div>

      {/* Cards Grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '32px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        {isInView && focusAreas.map((area, i) => (
          <TiltFocusCard key={area.title} area={area} index={i} />
        ))}
      </div>
    </section>
  );
}
