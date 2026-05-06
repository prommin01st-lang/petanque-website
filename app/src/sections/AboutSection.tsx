import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const facts = [
  { label: 'Role', value: 'Solo Full-Stack Developer' },
  { label: 'Focus', value: 'Real-time Collaboration Systems' },
  { label: 'Backend', value: '.NET 9, C#, ASP.NET Core, EF Core, SignalR' },
  { label: 'Frontend', value: 'Next.js 14-16, React 19, TypeScript' },
  { label: 'Databases', value: 'PostgreSQL, SQL Server' },
  { label: 'DevOps', value: 'Docker, PowerShell, Testcontainers' },
  { label: 'Location', value: 'Remote / Worldwide' },
];

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      id="about"
      ref={sectionRef}
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
          <span
            className="font-pixel"
            style={{
              fontSize: '14px',
              color: '#00E5FF',
              display: 'block',
              marginBottom: '12px',
            }}
          >
            // ABOUT
          </span>
          <h2
            className="font-pixel section-title-glow"
            style={{
              fontSize: '36px',
              color: '#F0EDE4',
              lineHeight: 1.2,
            }}
          >
            ABOUT ME
          </h2>
        </motion.div>

        {/* Two-column layout */}
        <div
          className="flex flex-col lg:flex-row gap-12 lg:gap-16"
        >
          {/* Left column: Bio text */}
          <motion.div
            className="lg:w-[60%]"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.15, ease: easeOutExpo }}
          >
            <p
              className="font-body"
              style={{
                fontSize: '18px',
                fontWeight: 300,
                color: '#8A8598',
                lineHeight: 1.7,
                marginBottom: '20px',
              }}
            >
              I am a Full-Stack Developer and DevOps-oriented engineer working solo on several production and internal tools. I focus on building real-time collaboration features, robust backend APIs, and developer automation.
            </p>
            <p
              className="font-body"
              style={{
                fontSize: '18px',
                fontWeight: 300,
                color: '#8A8598',
                lineHeight: 1.7,
                marginBottom: '20px',
              }}
            >
              My flagship project — a Kanban Task Management platform built with Next.js and .NET 9 — reduced manual task-management overhead by approximately 50% in day-to-day workflows through real-time drag &amp; drop, Google Calendar sync, and 15+ live event types powered by SignalR.
            </p>
            <p
              className="font-body"
              style={{
                fontSize: '18px',
                fontWeight: 300,
                color: '#8A8598',
                lineHeight: 1.7,
              }}
            >
              I believe in building production-grade software: 80%+ integration test coverage, containerized deployments, and clean architecture that scales from solo development to team collaboration.
            </p>
          </motion.div>

          {/* Right column: Quick Facts card */}
          <motion.div
            className="lg:w-[40%]"
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 60 }}
            transition={{ duration: 0.6, delay: 0.3, ease: easeOutExpo }}
          >
            <div
              style={{
                backgroundColor: '#1A1A2E',
                border: '2px solid rgba(108, 92, 231, 0.3)',
                borderRadius: '8px',
                padding: '32px',
              }}
            >
              <h3
                className="font-mono-labels"
                style={{
                  fontSize: '22px',
                  color: '#6C5CE7',
                  marginBottom: '24px',
                }}
              >
                QUICK FACTS
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {facts.map((fact) => (
                  <div key={fact.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#00E5FF',
                        borderRadius: 0,
                        flexShrink: 0,
                        marginTop: '8px',
                      }}
                    />
                    <span style={{ fontSize: '15px', lineHeight: 1.5 }}>
                      <span style={{ color: '#8A8598' }}>{fact.label}: </span>
                      <span style={{ color: '#F0EDE4' }}>{fact.value}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(138, 133, 152, 0.15)' }}>
                <a
                  href="https://github.com/prommin01st-lang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-labels"
                  style={{
                    fontSize: '16px',
                    color: '#00E5FF',
                    textDecoration: 'none',
                    transition: 'text-decoration 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.textDecoration = 'none';
                  }}
                >
                  GitHub: @prommin01st-lang
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
