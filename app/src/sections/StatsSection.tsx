import { useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';

const bounceEase = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  DATA — Focus Areas (meaningful expertise, not raw counts)          */
/* ------------------------------------------------------------------ */

interface FocusArea {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const focusAreas: FocusArea[] = [
  {
    title: 'Real-Time Systems',
    description: 'Live collaboration with SignalR, WebSockets & drag-and-drop sync',
    icon: <SignalIcon />,
  },
  {
    title: 'Full-Stack Architecture',
    description: 'End-to-end solutions: Next.js frontend + .NET backend',
    icon: <StackIcon />,
  },
  {
    title: 'DevOps & Quality',
    description: 'Docker, automated testing, CI/CD pipelines & clean architecture',
    icon: <DevopsIcon />,
  },
  {
    title: 'Cloud & AI Integration',
    description: 'Google APIs, Gemini AI, Cloudflare R2 & OAuth flows',
    icon: <CloudAiIcon />,
  },
];

/* ------------------------------------------------------------------ */
/*  ICONS                                                                */
/* ------------------------------------------------------------------ */

function SignalIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="4" fill="#00E5FF" />
      <path d="M20 4v8M20 28v8M4 20h8M28 20h8M10 10l4 4M26 26l4 4M10 30l4-4M26 14l4-4" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="16" width="14" height="20" rx="2" stroke="#00E5FF" strokeWidth="2" />
      <rect x="22" y="4" width="14" height="32" rx="2" stroke="#00E5FF" strokeWidth="2" />
      <line x1="11" y1="22" x2="11" y2="30" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
      <line x1="29" y1="10" x2="29" y2="30" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DevopsIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="12" height="12" rx="2" stroke="#00E5FF" strokeWidth="2" />
      <rect x="24" y="10" width="12" height="12" rx="2" stroke="#00E5FF" strokeWidth="2" />
      <rect x="14" y="26" width="12" height="12" rx="2" stroke="#00E5FF" strokeWidth="2" />
      <path d="M16 16h4M22 16l-2 12" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 22v4M30 22v4M20 26v-6" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloudAiIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 32a8 8 0 0 1-2-15.54A10 10 0 0 1 30 14a8 8 0 0 1-2 18z" stroke="#00E5FF" strokeWidth="2" fill="none" />
      <circle cx="26" cy="12" r="2" fill="#00E5FF" />
      <circle cx="32" cy="8" r="1.5" fill="#00E5FF" />
      <circle cx="30" cy="14" r="1" fill="#00E5FF" />
      <path d="M18 22l2 2 4-4" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  TILT CARD COMPONENT                                                  */
/* ------------------------------------------------------------------ */

function TiltFocusCard({
  area,
  index,
}: {
  area: FocusArea;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateY = (mouseX / (rect.width / 2)) * 10;
    const rotateX = -(mouseY / (rect.height / 2)) * 10;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        ease: bounceEase,
      }}
      style={{ perspective: '800px' }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '240px',
          minHeight: '200px',
          backgroundColor: '#1A1A2E',
          border: '2px solid rgba(108, 92, 231, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '28px 20px',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease-out',
          willChange: 'transform',
          cursor: 'default',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.5)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.3)';
        }}
      >
        {/* Icon */}
        <div style={{ marginBottom: '16px' }}>
          {area.icon}
        </div>

        {/* Title */}
        <span
          className="font-pixel text-center section-title-glow"
          style={{
            fontSize: '14px',
            color: '#F0EDE4',
            display: 'block',
            marginBottom: '12px',
            lineHeight: 1.4,
          }}
        >
          {area.title}
        </span>

        {/* Description */}
        <span
          className="font-body text-center"
          style={{
            fontSize: '15px',
            fontWeight: 300,
            color: '#8A8598',
            lineHeight: 1.6,
          }}
        >
          {area.description}
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN SECTION                                                         */
/* ------------------------------------------------------------------ */

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      id="stats"
      ref={sectionRef}
      style={{
        padding: '100px 24px',
        background: 'radial-gradient(ellipse at center, rgba(108, 92, 231, 0.08) 0%, transparent 60%)',
      }}
    >
      {/* Section Title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.5, ease: bounceEase }}
        className="text-center mb-16"
      >
        <span
          className="font-pixel text-[14px] block mb-4"
          style={{ color: '#00E5FF' }}
        >
          // EXPERTISE
        </span>
        <h2
          className="font-pixel text-[36px] leading-tight section-title-glow"
          style={{ color: '#F0EDE4' }}
        >
          CORE FOCUS AREAS
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
        {isInView &&
          focusAreas.map((area, i) => (
            <TiltFocusCard key={area.title} area={area} index={i} />
          ))}
      </div>
    </section>
  );
}
