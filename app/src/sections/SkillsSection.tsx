import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';

/* ------------------------------------------------------------------ */
/*  DATA — skill categories (aligned with prommin01st-lang.github.io)  */
/* ------------------------------------------------------------------ */

interface SkillCategory {
  key: 'backend' | 'frontend' | 'databases' | 'devopsTesting' | 'cloudIntegrations';
  skills: string[];
}

const skillCategories: SkillCategory[] = [
  {
    key: 'backend',
    skills: ['.NET 10', 'C#', 'ASP.NET Core', 'EF Core 10', 'SignalR', 'REST APIs'],
  },
  {
    key: 'frontend',
    skills: ['Next.js 14-16', 'React 19', 'TypeScript', 'Material UI', 'Tailwind CSS'],
  },
  {
    key: 'databases',
    skills: ['PostgreSQL', 'SQL Server', 'Redis'],
  },
  {
    key: 'devopsTesting',
    skills: ['Docker', 'PowerShell', 'xUnit', 'Testcontainers', 'FluentAssertions', 'Bruno'],
  },
  {
    key: 'cloudIntegrations',
    skills: ['Cloudflare R2', 'Google OAuth/Calendar', 'Gmail SMTP', 'Gemini API', 'RAG', 'LLM Fine-tuning'],
  },
];

/* ------------------------------------------------------------------ */
/*  MAIN SECTION                                                       */
/* ------------------------------------------------------------------ */

export default function SkillsSection() {
  const { t } = useI18n();

  return (
    <section
      id="skills"
      className="pointer-events-none"
      style={{
        padding: '120px 24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Section title */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="mb-16"
      >
        <span className="font-mono text-[13px] text-neon-cyan block mb-3">
          {t.skills.sectionLabel}
        </span>
        <h2 className="font-mono font-bold text-[28px] md:text-[36px] text-text leading-tight text-glow-cyan">
          {t.skills.title}
        </h2>
      </motion.div>

      {/* Category panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skillCategories.map((category, catIndex) => (
          <motion.div
            key={category.key}
            className="panel-hud p-6 pointer-events-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: catIndex * 0.08 }}
          >
            {/* Category header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="font-mono text-[14px] text-terminal-green">$</span>
              <span className="font-mono text-[14px] text-text font-medium">
                ./{category.key === 'devopsTesting' ? 'devops-testing' : category.key === 'cloudIntegrations' ? 'cloud-integrations' : category.key}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(30, 42, 56, 0.8)' }} />
              <span className="font-mono text-[11px] text-text-dim">
                {t.skills.categories[category.key]}
              </span>
            </div>

            {/* Skill chips */}
            <div className="flex flex-wrap gap-2">
              {category.skills.map((skill, i) => (
                <motion.span
                  key={skill}
                  className="chip"
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: catIndex * 0.08 + i * 0.04 }}
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
