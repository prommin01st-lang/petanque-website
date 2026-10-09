import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';
import { TerminalWindow } from '@/components/term';
import { SKILL_CATEGORIES } from '@/data/skills';
import SectionHeading from './SectionHeading';

const FILE_COUNT = SKILL_CATEGORIES.reduce((n, c) => n + c.skills.length, 0);

/* ------------------------------------------------------------------ */
/*  MAIN SECTION — `tree ~/skills`                                     */
/* ------------------------------------------------------------------ */

export default function SkillsSection() {
  const { t } = useI18n();

  return (
    <section id="skills" className="py-20 px-4 sm:px-6 md:px-10 pointer-events-none">
      <div className="max-w-6xl mx-auto">
        <SectionHeading command="tree ~/skills" title={t.skills.title} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
        >
          <TerminalWindow title="~/skills">
            <div className="px-1 py-2 md:px-3 font-mono text-[13px] leading-relaxed">
              <p className="font-bold text-ansi-bright-blue">.</p>
              <div className="mt-1 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                {SKILL_CATEGORIES.map((category) => (
                  <div key={category.key} className="min-w-0">
                    <p className="break-words">
                      <span className="text-ansi-bright-blue font-bold">{category.dir}/</span>{' '}
                      <span className="text-text-dim"># {t.skills.categories[category.key]}</span>
                    </p>
                    <ul className="list-none p-0 m-0">
                      {category.skills.map((skill, i) => (
                        <li key={skill} className="whitespace-nowrap">
                          <span aria-hidden="true" className="text-text-dim">
                            {i === category.skills.length - 1 ? '└── ' : '├── '}
                          </span>
                          <span className="text-text">{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-text-dim">
                {SKILL_CATEGORIES.length} {t.skills.directories}, {FILE_COUNT} {t.skills.files}
              </p>
            </div>
          </TerminalWindow>
        </motion.div>
      </div>
    </section>
  );
}
