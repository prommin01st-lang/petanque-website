import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';

/* ------------------------------------------------------------------ */
/*  Easing presets                                                     */
/* ------------------------------------------------------------------ */
const bounceEase = [0.34, 1.56, 0.64, 1] as [number, number, number, number];
const smoothEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  Hero Section — content floats over the 3D sandbox                  */
/* ------------------------------------------------------------------ */
export default function HeroSection() {
  const { t } = useI18n();

  const nameLetters = t.hero.name.split('');

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] overflow-hidden flex items-center pointer-events-none"
    >
      {/* Soft vignette so text stays readable over the 3D scene */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 32% 45%, rgba(5, 8, 13, 0.72) 0%, rgba(5, 8, 13, 0.25) 55%, transparent 100%)',
        }}
      />

      {/* Content wrapper */}
      <div className="relative w-full max-w-7xl mx-auto px-6 md:px-20 flex flex-col md:flex-row items-center pt-16">
        {/* Left side — 55% */}
        <div className="w-full md:w-[55%] flex flex-col justify-center py-12 md:py-0 pointer-events-auto">
          {/* Shell prompt greeting */}
          <motion.div
            className="flex items-center gap-2 mb-6 font-mono text-[15px] md:text-[17px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="text-terminal-green">prommin@sandbox</span>
            <span className="text-text-dim">:</span>
            <span className="text-neon-cyan">~</span>
            <span className="text-text-dim">$</span>
            <span className="text-text">{t.hero.greeting.replace(/^>\s*/, '')}</span>
            <span className="inline-block w-2 h-4 bg-neon-cyan animate-blink-cursor" />
          </motion.div>

          {/* Name */}
          <div className="flex flex-wrap mb-6">
            {nameLetters.map((letter, i) => (
              <motion.span
                key={`n-${i}`}
                className="font-mono font-bold text-[42px] md:text-[68px] leading-none text-text text-glow-cyan inline-block"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 0.45 + i * 0.05,
                  ease: bounceEase,
                }}
              >
                {letter === '.' ? (
                  <span className="text-neon-cyan">.</span>
                ) : (
                  letter
                )}
              </motion.span>
            ))}
          </div>

          {/* Tagline */}
          <motion.p
            className="font-body text-[17px] md:text-[18px] font-light text-text-dim max-w-[520px] leading-relaxed mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            {t.hero.tagline}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-wrap gap-4 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.05 }}
          >
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-neon"
            >
              {t.hero.ctaPrimary}
            </a>
            <a
              href="https://github.com/prommin01st-lang"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-neon-outline"
            >
              {t.hero.ctaSecondary}
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
                  delayChildren: 1.2,
                },
              },
            }}
          >
            {t.hero.stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
              >
                <div className="font-mono font-bold text-[22px] text-neon-cyan mb-1">
                  {stat.value}
                </div>
                <div className="font-mono text-[12px] text-text-dim">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Right side — 45%: profile as terminal window */}
        <div className="w-full md:w-[45%] flex items-center justify-center py-12 md:py-0 pointer-events-auto">
          <motion.div
            className="term-window w-full max-w-[340px]"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: smoothEase, delay: 0.5 }}
          >
            {/* Terminal header */}
            <div className="term-window-header">
              <span className="term-dot term-dot-red" />
              <span className="term-dot term-dot-amber" />
              <span className="term-dot term-dot-green" />
              <span className="ml-2">~/profile.png</span>
            </div>

            {/* Image */}
            <div className="p-3">
              <div className="w-full overflow-hidden rounded-md" style={{ border: '1px solid #1E2A38' }}>
                <img
                  src="/profile.png"
                  alt="Prommin L. profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Status line */}
            <div
              className="flex items-center gap-2 px-4 py-3 font-mono text-[12px]"
              style={{ borderTop: '1px solid #1E2A38' }}
            >
              <span className="text-text-dim">{t.hero.statusLabel}:</span>
              <span className="inline-block w-2 h-2 rounded-full bg-terminal-green animate-pulse-dot" />
              <span className="text-terminal-green">{t.hero.statusValue}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
