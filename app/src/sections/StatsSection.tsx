import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';
import { TerminalWindow } from '@/components/term';
import SectionHeading from './SectionHeading';

const smoothEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/*  DATA — Focus Areas                                                 */
/* ------------------------------------------------------------------ */

type AreaKey = 'realtime' | 'fullstack' | 'cloudAi';

const focusAreas: { key: AreaKey; command: string }[] = [
  { key: 'realtime', command: 'ping --realtime' },
  { key: 'fullstack', command: 'dotnet run --full-stack' },
  { key: 'cloudAi', command: 'deploy --cloud --ai' },
];

/* ------------------------------------------------------------------ */
/*  MAIN SECTION                                                       */
/* ------------------------------------------------------------------ */

export default function StatsSection() {
  const { t } = useI18n();

  return (
    <section id="stats" className="py-20 px-4 sm:px-6 md:px-10 pointer-events-none">
      <div className="max-w-6xl mx-auto">
        <SectionHeading command="top --focus" title={t.stats.title} />

        <div className="grid gap-8 md:grid-cols-3">
          {focusAreas.map((area, i) => (
            <motion.div
              key={area.key}
              className="flex"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: smoothEase }}
            >
              <TerminalWindow title={area.command} className="term-window-fill w-full">
                <h3 className="font-mono font-bold text-[15px] text-text leading-snug">
                  {t.stats.areas[area.key].title}
                </h3>
                <p className="mt-2 font-body text-[14px] font-light text-text-dim leading-relaxed">
                  {t.stats.areas[area.key].description}
                </p>
              </TerminalWindow>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
