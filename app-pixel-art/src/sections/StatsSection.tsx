import React from 'react'
import { Briefcase, Users, Award, Clock } from 'lucide-react'

interface Stat {
  icon: React.ElementType
  value: string
  label: string
  color: string
}

const stats: Stat[] = [
  {
    icon: Briefcase,
    value: '50+',
    label: 'Projects Delivered',
    color: 'var(--accent-cyan)',
  },
  {
    icon: Users,
    value: '30+',
    label: 'Happy Clients',
    color: 'var(--accent-magenta)',
  },
  {
    icon: Award,
    value: '12',
    label: 'Awards Won',
    color: 'var(--accent-gold)',
  },
  {
    icon: Clock,
    value: '5K+',
    label: 'Hours Coded',
    color: 'var(--accent-cyan)',
  },
]

const focusAreas = [
  {
    title: 'Web Development',
    description: 'Building scalable, performant web applications with modern frameworks.',
    accentColor: 'var(--accent-cyan)',
  },
  {
    title: 'UI/UX Design',
    description: 'Creating intuitive, pixel-perfect interfaces that users love.',
    accentColor: 'var(--accent-magenta)',
  },
  {
    title: 'Open Source',
    description: 'Contributing to and maintaining popular open-source projects.',
    accentColor: 'var(--accent-gold)',
  },
  {
    title: 'Mentorship',
    description: 'Helping junior developers grow through code reviews and pairing.',
    accentColor: 'var(--accent-cyan)',
  },
]

const StatsSection: React.FC = () => {
  return (
    <section
      id="stats"
      style={{ background: 'var(--surface)', paddingTop: '96px', paddingBottom: '96px' }}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: '64px' }}>
          <p className="badge-pixel-alt" style={{ marginBottom: '16px', display: 'inline-block' }}>
            &gt; STATS
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
            By The Numbers
          </h2>
        </div>

        {/* Stats Grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: '24px', marginBottom: '80px' }}
        >
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="card-pixel flex flex-col items-center text-center"
                style={{ gap: '12px', padding: '24px' }}
              >
                <Icon
                  size={32}
                  style={{
                    color: stat.color,
                    imageRendering: 'pixelated',
                  }}
                />
                <p
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: '20px',
                    letterSpacing: '0.04em',
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-text-dim"
                  style={{
                    fontFamily: 'var(--font-label)',
                    fontSize: '18px',
                  }}
                >
                  {stat.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Focus Areas Header */}
        <div className="text-center" style={{ marginBottom: '48px' }}>
          <h3
            className="text-text"
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '18px',
              letterSpacing: '0.04em',
            }}
          >
            Current Focus
          </h3>
        </div>

        {/* Focus Areas */}
        <div className="grid sm:grid-cols-2" style={{ gap: '24px' }}>
          {focusAreas.map((area) => (
            <div
              key={area.title}
              className="card-pixel"
              style={{
                borderLeft: `4px solid ${area.accentColor}`,
              }}
            >
              <h4
                className="text-text"
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '10px',
                  letterSpacing: '0.02em',
                  marginBottom: '8px',
                }}
              >
                {area.title}
              </h4>
              <p
                className="text-text-dim"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                {area.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default StatsSection
