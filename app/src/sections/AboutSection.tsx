import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function AboutSection() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const facts = [
    { label: t.about.facts.role, value: t.about.facts.roleValue },
    { label: t.about.facts.focus, value: t.about.facts.focusValue },
    { label: t.about.facts.backend, value: t.about.facts.backendValue },
    { label: t.about.facts.frontend, value: t.about.facts.frontendValue },
    { label: t.about.facts.databases, value: t.about.facts.databasesValue },
    { label: t.about.facts.devops, value: t.about.facts.devopsValue },
    { label: t.about.facts.cloud, value: t.about.facts.cloudValue },
    { label: t.about.facts.location, value: t.about.facts.locationValue },
  ];

  return (
    <section
      id="about"
      ref={sectionRef}
      className="pointer-events-none"
      style={{ padding: '120px 24px' }}
    >
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          style={{ marginBottom: '64px' }}
        >
          <span className="font-mono text-[13px] text-neon-cyan block mb-3">
            {t.about.sectionLabel}
          </span>
          <h2 className="font-mono font-bold text-[28px] md:text-[36px] text-text leading-tight text-glow-cyan">
            {t.about.title}
          </h2>
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left column: Bio text */}
          <motion.div
            className="lg:w-[58%] pointer-events-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.15, ease: easeOutExpo }}
          >
            <p className="font-body text-[17px] font-light text-text-dim leading-relaxed mb-5">
              {t.about.bio1}
            </p>
            <p className="font-body text-[17px] font-light text-text-dim leading-relaxed mb-5">
              {t.about.bio2}
            </p>
            <p className="font-body text-[17px] font-light text-text-dim leading-relaxed">
              {t.about.bio3}
            </p>
          </motion.div>

          {/* Right column: quick_facts.yaml terminal card */}
          <motion.div
            className="lg:w-[42%] pointer-events-auto"
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 60 }}
            transition={{ duration: 0.6, delay: 0.3, ease: easeOutExpo }}
          >
            <div className="term-window">
              {/* Terminal header */}
              <div className="term-window-header">
                <span className="term-dot term-dot-red" />
                <span className="term-dot term-dot-amber" />
                <span className="term-dot term-dot-green" />
                <span className="ml-2">{t.about.factsTitle}</span>
              </div>

              {/* YAML-style facts */}
              <div className="p-5 font-mono text-[13px] leading-relaxed">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex items-baseline gap-2 py-1.5">
                    <span className="text-neon-cyan shrink-0">{fact.label}:</span>
                    <span className="text-text">{fact.value}</span>
                  </div>
                ))}

                <div
                  className="mt-4 pt-3"
                  style={{ borderTop: '1px solid rgba(30, 42, 56, 0.7)' }}
                >
                  <a
                    href="https://github.com/prommin01st-lang"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-neon"
                  >
                    github: @prommin01st-lang
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
