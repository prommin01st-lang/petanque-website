import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePixelit } from '../hooks/usePixelit';

/* ------------------------------------------------------------------ */
/*  StarField — isolated perpetual animation                           */
/* ------------------------------------------------------------------ */
function StarField() {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 3 + Math.random() * 3,
      opacity: 0.2 + Math.random() * 0.6,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 3,
      shouldTwinkle: Math.random() > 0.5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {stars.map((star) => (
        <div
          key={star.id}
          className={star.shouldTwinkle ? 'animate-twinkle' : ''}
          style={{
            position: 'absolute',
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            backgroundColor: '#F0EDE4',
            opacity: star.opacity,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FloatingPixelBlocks — isolated perpetual animation                 */
/* ------------------------------------------------------------------ */
function FloatingPixelBlocks() {
  const blocks = useMemo(() => {
    const colors = ['#6C5CE7', '#00E5FF', '#FF6B9D'];
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 90}%`,
      width: 20 + Math.random() * 60,
      height: 20 + Math.random() * 60,
      color: colors[i % colors.length],
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 5,
      zIndex: Math.random() > 0.5 ? 1 : 15,
    }));
  }, []);

  return (
    <>
      {blocks.map((block) => (
        <div
          key={block.id}
          className="absolute pointer-events-none animate-float-drift rounded-sm"
          style={{
            left: block.left,
            top: block.top,
            width: block.width,
            height: block.height,
            backgroundColor: block.color,
            opacity: 0.15,
            animationDuration: `${block.duration}s`,
            animationDelay: `${block.delay}s`,
            zIndex: block.zIndex,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PixelBracket — decorative corner L-shape                           */
/* ------------------------------------------------------------------ */
function PixelBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const positionStyles = {
    tl: { top: '-16px', left: '-16px' },
    tr: { top: '-16px', right: '-16px', transform: 'rotate(90deg)' },
    bl: { bottom: '-16px', left: '-16px', transform: 'rotate(-90deg)' },
    br: { bottom: '-16px', right: '-16px', transform: 'rotate(180deg)' },
  };

  const hoverStyles = {
    tl: { top: '-24px', left: '-24px' },
    tr: { top: '-24px', right: '-24px' },
    bl: { bottom: '-24px', left: '-24px' },
    br: { bottom: '-24px', right: '-24px' },
  };

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={positionStyles[position]}
      initial={false}
      whileHover={hoverStyles[position]}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3h8v3H6v8H3V3z" fill="#00E5FF" />
      </svg>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Easing presets                                                     */
/* ------------------------------------------------------------------ */
const bounceEase = [0.34, 1.56, 0.64, 1] as [number, number, number, number];
const smoothEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
export default function HeroSection() {
  const profileImgRef = useRef<HTMLImageElement>(null);
  usePixelit(profileImgRef);

  const nameLetters = 'PETANQUE'.split('');
  const nameLetters2 = 'PROMMIN'.split('');

  const stats = [
    { number: '6+', label: 'Projects' },
    { number: '50%', label: 'Overhead Reduced' },
    { number: '15+', label: 'Real-time Events' },
  ];

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] overflow-hidden flex items-center"
      style={{ backgroundColor: '#0D0D14' }}
    >
      {/* 1. Pixel starfield */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <StarField />
      </motion.div>

      {/* 2. Grid floor */}
      <motion.div
        className="grid-floor"
        initial={{ transform: 'rotateX(60deg) translateZ(-200px) translateY(100%)', opacity: 0 }}
        animate={{ transform: 'rotateX(60deg) translateZ(-200px) translateY(0)', opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        style={{ zIndex: 1 }}
      />

      {/* 3. Floating pixel blocks */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        style={{ zIndex: 15 }}
      >
        <FloatingPixelBlocks />
      </motion.div>

      {/* Hero vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, #0D0D14 70%)',
          zIndex: 10,
        }}
      />

      {/* Content wrapper */}
      <div
        className="relative w-full max-w-7xl mx-auto px-6 md:px-20 flex flex-col md:flex-row items-center"
        style={{ zIndex: 20, paddingTop: '64px' }}
      >
        {/* Left side — 55% */}
        <div className="w-full md:w-[55%] flex flex-col justify-center py-12 md:py-0">
          {/* Label */}
          <motion.div
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <span
              className="font-mono-labels text-[22px] tracking-[0.15em] text-neon-cyan"
            >
              SOLO DEVELOPER
            </span>
            {/* Blinking cursor */}
            <span
              className="inline-block w-2 h-3 bg-neon-cyan animate-blink-cursor"
            />
          </motion.div>

          {/* Name: PROMMIN */}
          <div className="flex flex-wrap mb-2">
            {nameLetters.map((letter, i) => (
              <motion.span
                key={`n1-${i}`}
                className="font-pixel text-[32px] md:text-[56px] text-warm-white text-3d-extruded inline-block"
                style={{ marginRight: letter === ' ' ? '0.5em' : '0' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.06,
                  ease: bounceEase,
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Name: .LANG */}
          <div className="flex flex-wrap mb-6">
            {nameLetters2.map((letter, i) => (
              <motion.span
                key={`n2-${i}`}
                className="font-pixel text-[32px] md:text-[56px] text-pixel-purple text-3d-extruded-purple inline-block"
                style={{ marginRight: letter === ' ' ? '0.5em' : '0' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 0.3 + i * 0.06,
                  ease: bounceEase,
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Tagline */}
          <motion.p
            className="font-body text-[18px] font-light text-mid-gray max-w-[480px] leading-relaxed mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Full-Stack Developer & MCP-oriented engineer building real-time
            collaboration systems, enterprise backends, and developer automation.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-wrap gap-4 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="font-mono-labels text-[20px] uppercase px-8 py-3.5 rounded transition-all duration-250"
              style={{
                backgroundColor: '#6C5CE7',
                color: '#F0EDE4',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00E5FF';
                e.currentTarget.style.color = '#0D0D14';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6C5CE7';
                e.currentTarget.style.color = '#F0EDE4';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              View My Work
            </a>
            <a
              href="https://github.com/prommin01st-lang"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono-labels text-[20px] uppercase px-8 py-3.5 rounded transition-all duration-250"
              style={{
                backgroundColor: 'transparent',
                color: '#F0EDE4',
                border: '2px solid #8A8598',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00E5FF';
                e.currentTarget.style.color = '#00E5FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#8A8598';
                e.currentTarget.style.color = '#F0EDE4';
              }}
            >
              GitHub
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex flex-wrap gap-8 md:gap-12"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.9,
                },
              },
            }}
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
              >
                <div className="font-pixel text-[24px] text-neon-cyan mb-1">
                  {stat.number}
                </div>
                <div className="font-mono-labels text-[16px] text-mid-gray">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right side — 45% */}
        <div className="w-full md:w-[45%] flex items-center justify-center py-12 md:py-0">
          <motion.div
            className="relative"
            style={{ width: '320px', height: '320px' }}
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: smoothEase, delay: 0.4 }}
          >
            {/* Aura glow behind */}
            <div
              className="absolute inset-0 profile-aura rounded-lg"
              style={{
                transform: 'scale(1.4)',
                filter: 'blur(20px)',
              }}
            />

            {/* Profile image container */}
            <div className="relative w-full h-full group" style={{ zIndex: 5 }}>
              {/* Pixel brackets at corners */}
              <PixelBracket position="tl" />
              <PixelBracket position="tr" />
              <PixelBracket position="bl" />
              <PixelBracket position="br" />

              {/* Profile image */}
              <div className="w-full h-full rounded-lg overflow-hidden pixel-frame transition-transform duration-300 group-hover:scale-[1.02]">
                <img
                  ref={profileImgRef}
                  src="/profile.png"
                  alt="Petanque Prommin pixel art portrait"
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
