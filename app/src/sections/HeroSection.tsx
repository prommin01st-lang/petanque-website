import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';
import { TerminalWindow, FigletTitle, FIGLET_NAME, Prompt } from '@/components/term';
import AsciiImage from '@/components/AsciiImage';

const smoothEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  Hero — figlet name, typed prompts, CTAs, stats table, profile      */
/* ------------------------------------------------------------------ */

const coarsePointer = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

/** Renders each ` in the hint as a <kbd>. */
function ShellHint({ text }: { text: string }) {
  const parts = text.split('`');
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <kbd className="px-1 border border-hud-border rounded-sm text-text font-mono">`</kbd>}
          {p}
        </span>
      ))}
    </>
  );
}

export default function HeroSection() {
  const { t } = useI18n();
  const [touch] = useState(coarsePointer);

  return (
    <section
      id="hero"
      className="relative min-h-[100dvh] flex items-center pointer-events-none"
    >
      {/* Soft vignette so text stays readable over the ASCII background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 32% 45%, rgba(12, 12, 12, 0.78) 0%, rgba(12, 12, 12, 0.3) 55%, transparent 100%)',
        }}
      />

      <div className="relative w-full px-4 sm:px-6 md:px-10 pt-24 pb-16">
        <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_400px] items-center">
          {/* Left — terminal session */}
          <motion.div
            className="min-w-0 pointer-events-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: smoothEase }}
          >
            <div className="hero-figlet">
              <FigletTitle text={t.hero.name} art={FIGLET_NAME} />
            </div>

            <div className="mt-8 space-y-2">
              <Prompt command="whoami" typing />
              <p className="font-body text-[16px] md:text-[17px] font-light text-text-dim max-w-[560px] leading-relaxed pb-3">
                {t.hero.tagline}
              </p>
              <Prompt command="cat status.txt" />
              <p className="font-mono text-[13px] flex flex-wrap items-center gap-x-2">
                <span className="text-text-dim">{t.hero.statusLabel}:</span>
                <span aria-hidden="true" className="inline-block w-2 h-2 bg-ansi-bright-green animate-pulse-dot" />
                <span className="text-ansi-bright-green">{t.hero.statusValue}</span>
              </p>
              <p data-testid="shell-hint" className="font-mono text-[12px] text-text-dim">
                <span aria-hidden="true"># </span>
                <ShellHint text={touch ? t.shell.heroHintTouch : t.shell.heroHint} />
              </p>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#projects"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-neon btn-term"
              >
                {`[ ${t.hero.ctaPrimary} ]`}
              </a>
              <Link to="/blog" className="btn-neon-outline btn-term">
                {`[ ${t.hero.ctaSecondary} ]`}
              </Link>
            </div>

            {/* Stats — ASCII table */}
            <dl className="ascii-table mt-10 max-w-[560px]">
              {t.hero.stats.map((stat) => (
                <div key={stat.label} className="ascii-table-cell flex flex-col-reverse">
                  <dt className="font-mono text-[11px] md:text-[12px] text-text-dim leading-snug">{stat.label}</dt>
                  <dd className="font-mono font-bold text-[18px] md:text-[22px] text-warn mb-1">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Right — profile picture */}
          <motion.div
            className="w-full max-w-[400px] mx-auto pointer-events-auto"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase, delay: 0.2 }}
          >
            <TerminalWindow title="~/profile.png">
              <AsciiImage src="/profile.png" alt={t.hero.profileAlt} />
            </TerminalWindow>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
