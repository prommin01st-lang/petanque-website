import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';
import { TerminalWindow } from '@/components/term';
import SectionHeading from './SectionHeading';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

export default function AboutSection() {
  const { t } = useI18n();

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
    <section id="about" className="py-20 px-4 sm:px-6 md:px-10 pointer-events-none">
      <div className="max-w-6xl mx-auto">
        <SectionHeading command="cat ~/about/README.md" title={t.about.title} />

        <motion.div
          className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
        >
          <TerminalWindow title="~/about/README.md">
            <div className="space-y-4 px-1 py-2 md:px-3">
              {[t.about.bio1, t.about.bio2, t.about.bio3].map((para) => (
                <p key={para} className="font-body text-[15.5px] md:text-[16px] font-light text-text-dim leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </TerminalWindow>

          <TerminalWindow title={`~/about/${t.about.factsTitle}`}>
            <div className="px-1 py-2 font-mono text-[13px] leading-relaxed">
              <p className="text-text-dim">---</p>
              {facts.map((fact) => (
                <p key={fact.label} className="py-1">
                  <span className="text-ansi-bright-blue">{fact.label}:</span>{' '}
                  <span className="text-text">{fact.value}</span>
                </p>
              ))}
              <p className="mt-3 pt-3 border-t border-dashed border-hud-border">
                <span className="text-ansi-bright-blue">github:</span>{' '}
                <a
                  href="https://github.com/prommin01st-lang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-neon"
                >
                  @prommin01st-lang
                </a>
              </p>
            </div>
          </TerminalWindow>
        </motion.div>
      </div>
    </section>
  );
}
