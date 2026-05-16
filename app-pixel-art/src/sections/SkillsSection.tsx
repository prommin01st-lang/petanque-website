import React from 'react'
import {
  Code2,
  Palette,
  Server,
  Database,
  Wrench,
  Globe,
} from 'lucide-react'

interface Skill {
  name: string
  level: number
}

interface SkillCategory {
  title: string
  icon: React.ElementType
  accentColor: string
  accentBorder: string
  skills: Skill[]
}

const skillCategories: SkillCategory[] = [
  {
    title: 'Frontend',
    icon: Code2,
    accentColor: 'var(--accent-cyan)',
    accentBorder: 'var(--accent-cyan)',
    skills: [
      { name: 'React / Next.js', level: 95 },
      { name: 'TypeScript', level: 90 },
      { name: 'Tailwind CSS', level: 92 },
      { name: 'HTML / CSS', level: 98 },
    ],
  },
  {
    title: 'Backend',
    icon: Server,
    accentColor: 'var(--accent-magenta)',
    accentBorder: 'var(--accent-magenta)',
    skills: [
      { name: 'Node.js', level: 88 },
      { name: 'Express / NestJS', level: 85 },
      { name: 'Python / Django', level: 75 },
      { name: 'GraphQL', level: 80 },
    ],
  },
  {
    title: 'Database',
    icon: Database,
    accentColor: 'var(--accent-gold)',
    accentBorder: 'var(--accent-gold)',
    skills: [
      { name: 'PostgreSQL', level: 85 },
      { name: 'MongoDB', level: 82 },
      { name: 'Redis', level: 75 },
      { name: 'Prisma ORM', level: 88 },
    ],
  },
  {
    title: 'Design',
    icon: Palette,
    accentColor: 'var(--accent-cyan)',
    accentBorder: 'var(--accent-cyan)',
    skills: [
      { name: 'Figma', level: 80 },
      { name: 'UI/UX Design', level: 78 },
      { name: 'Adobe XD', level: 70 },
      { name: 'Prototyping', level: 75 },
    ],
  },
  {
    title: 'MCP',
    icon: Wrench,
    accentColor: 'var(--accent-magenta)',
    accentBorder: 'var(--accent-magenta)',
    skills: [
      { name: 'Docker', level: 82 },
      { name: 'AWS / Vercel', level: 78 },
      { name: 'CI/CD', level: 80 },
      { name: 'Git / GitHub', level: 92 },
    ],
  },
  {
    title: 'Other',
    icon: Globe,
    accentColor: 'var(--accent-gold)',
    accentBorder: 'var(--accent-gold)',
    skills: [
      { name: 'REST APIs', level: 92 },
      { name: 'WebSockets', level: 78 },
      { name: 'Testing (Jest)', level: 82 },
      { name: 'Agile / Scrum', level: 85 },
    ],
  },
]

const SkillsSection: React.FC = () => {
  return (
    <section id="skills" className="bg-bg" style={{ paddingTop: '96px', paddingBottom: '96px' }}>
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: '64px' }}>
          <p className="badge-pixel-alt" style={{ marginBottom: '16px', display: 'inline-block' }}>
            &gt; SKILLS
          </p>
          <h2
            className="text-text"
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '24px',
              letterSpacing: '0.04em',
              lineHeight: 1.3,
            }}
          >
            Tech Stack
          </h2>
          <p
            className="text-text-dim"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '20px',
              marginTop: '16px',
            }}
          >
            Technologies I work with daily
          </p>
        </div>

        {/* Skills Grid */}
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3"
          style={{ gap: '32px' }}
        >
          {skillCategories.map((category) => {
            const Icon = category.icon
            return (
              <div
                key={category.title}
                className="card-pixel"
                style={{ borderRadius: '0px' }}
              >
                {/* Category Header */}
                <div className="flex items-center" style={{ gap: '12px', marginBottom: '24px' }}>
                  <div
                    className="flex items-center justify-center bg-surface"
                    style={{
                      width: '40px',
                      height: '40px',
                      border: `2px solid ${category.accentBorder}`,
                      borderRadius: '0px',
                    }}
                  >
                    <Icon
                      size={20}
                      style={{
                        color: category.accentColor,
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: '10px',
                      letterSpacing: '0.02em',
                      color: category.accentColor,
                    }}
                  >
                    {category.title}
                  </h3>
                </div>

                {/* Skills List */}
                <div className="flex flex-col" style={{ gap: '16px' }}>
                  {category.skills.map((skill) => (
                    <div key={skill.name}>
                      <div
                        className="flex justify-between"
                        style={{ marginBottom: '4px' }}
                      >
                        <span
                          className="text-text"
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '18px',
                          }}
                        >
                          {skill.name}
                        </span>
                        <span
                          className="text-text-dim"
                          style={{
                            fontFamily: 'var(--font-label)',
                            fontSize: '16px',
                          }}
                        >
                          {skill.level}%
                        </span>
                      </div>
                      {/* Pixel Progress Bar */}
                      <div
                        className="w-full bg-surface"
                        style={{
                          height: '12px',
                          border: '2px solid var(--border)',
                          borderRadius: '0px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${skill.level}%`,
                            backgroundColor: category.accentColor,
                            borderRadius: '0px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default SkillsSection
