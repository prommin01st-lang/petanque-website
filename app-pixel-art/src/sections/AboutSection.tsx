import React from 'react'
import { MapPin, Calendar, Coffee, Code2 } from 'lucide-react'

const quickFacts = [
  { icon: MapPin, label: 'Location', value: 'San Francisco, CA' },
  { icon: Calendar, label: 'Experience', value: '5+ Years' },
  { icon: Coffee, label: 'Coffee Consumed', value: '10,000+ Cups' },
  { icon: Code2, label: 'Lines of Code', value: '500K+' },
]

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="bg-bg" style={{ paddingTop: '96px', paddingBottom: '96px' }}>
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center" style={{ marginBottom: '64px' }}>
          <p className="badge-pixel-alt" style={{ marginBottom: '16px', display: 'inline-block' }}>
            &gt; ABOUT_ME
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
            Get To Know Me
          </h2>
        </div>

        <div
          className="flex flex-col md:flex-row"
          style={{ gap: '64px' }}
        >
          {/* Left: Story */}
          <div className="flex-1">
            <div className="card-pixel">
              <h3
                className="text-accent-cyan"
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: '14px',
                  letterSpacing: '0.02em',
                  marginBottom: '24px',
                }}
              >
                My Story
              </h3>
              <div
                className="flex flex-col text-text-dim"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  lineHeight: 1.6,
                  gap: '16px',
                }}
              >
                <p>
                  I started my journey as a self-taught developer, spending countless
                  nights learning to code with nothing but a laptop and endless
                  curiosity. Today, I specialize in building scalable web
                  applications that combine beautiful design with robust
                  architecture.
                </p>
                <p>
                  When I&apos;m not coding, you&apos;ll find me exploring retro games,
                  contributing to open-source projects, or mentoring aspiring
                  developers. I believe in writing clean, maintainable code and
                  creating experiences that users genuinely enjoy.
                </p>
                <p>
                  My stack revolves around React, TypeScript, Node.js, and modern
                  cloud infrastructure. I&apos;m always excited to learn new
                  technologies and take on challenging projects.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Facts */}
          <div className="flex flex-1 flex-col" style={{ gap: '16px' }}>
            <h3
              className="text-accent-magenta"
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: '14px',
                letterSpacing: '0.02em',
                marginBottom: '8px',
              }}
            >
              Quick Facts
            </h3>
            {quickFacts.map((fact) => {
              const Icon = fact.icon
              return (
                <div
                  key={fact.label}
                  className="card-pixel flex items-center"
                  style={{ gap: '16px' }}
                >
                  {/* Pixel Dot - 4px sharp square */}
                  <div
                    className="flex flex-shrink-0 items-center justify-center bg-surface"
                    style={{
                      width: '48px',
                      height: '48px',
                      border: '2px solid var(--border)',
                      borderRadius: '0px',
                    }}
                  >
                    <Icon
                      size={24}
                      style={{
                        color: 'var(--accent-cyan)',
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-text"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '20px',
                      }}
                    >
                      {fact.value}
                    </p>
                    <p
                      className="text-text-dim"
                      style={{
                        fontFamily: 'var(--font-label)',
                        fontSize: '16px',
                      }}
                    >
                      {fact.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection
