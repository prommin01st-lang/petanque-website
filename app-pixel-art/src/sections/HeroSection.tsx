import React from 'react'
import { Github, Linkedin, Twitter, FileText, ChevronRight } from 'lucide-react'

const HeroSection: React.FC = () => {
  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg"
      style={{ paddingTop: '80px' }}
    >
      {/* Grid Floor Background */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.2,
          backgroundImage:
            'linear-gradient(#2A2B3D 1px, transparent 1px), linear-gradient(90deg, #2A2B3D 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          imageRendering: 'pixelated',
        }}
      />

      {/* Floating Pixel Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-accent-cyan"
            style={{
              width: '4px',
              height: '4px',
              left: `${10 + (i * 7) % 80}%`,
              top: `${20 + (i * 13) % 60}%`,
              animation: `pixel-float ${2 + (i % 3)}s steps(8) infinite`,
              animationDelay: `${i * 0.3}s`,
              opacity: 0.4 + (i % 3) * 0.2,
              imageRendering: 'pixelated',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div
        className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 md:flex-row"
        style={{ gap: '64px', paddingTop: '80px', paddingBottom: '80px' }}
      >
        {/* Left: Text Content */}
        <div className="flex flex-1 flex-col items-start" style={{ gap: '32px' }}>
          {/* Greeting Badge */}
          <div className="badge-pixel-alt">&gt; FULL STACK DEVELOPER</div>

          {/* Title */}
          <h1
            className="text-text"
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '28px',
              lineHeight: 1.3,
              letterSpacing: '0.04em',
            }}
          >
            Hi, I&apos;m{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>Alex</span>
          </h1>

          {/* Subtitle */}
          <h2
            className="text-text-dim"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '32px',
              lineHeight: 1.3,
              letterSpacing: '0.02em',
            }}
          >
            I build pixel-perfect web experiences
          </h2>

          {/* Description */}
          <p
            className="max-w-xl text-text-dim"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              lineHeight: 1.6,
            }}
          >
            A passionate developer crafting modern applications with clean code,
            creative design, and attention to every single pixel. Specializing in
            React, TypeScript, and Node.js ecosystems.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap" style={{ gap: '16px' }}>
            <a href="#projects" className="btn-pixel-primary">
              View Projects
              <ChevronRight size={20} />
            </a>
            <a href="#contact" className="btn-pixel">
              <FileText size={20} />
              Contact Me
            </a>
          </div>

          {/* Social Links */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            <a
              href="#"
              className="flex items-center justify-center border-2 bg-surface text-text-dim hover:text-accent-cyan"
              style={{
                width: '40px',
                height: '40px',
                borderColor: 'var(--border)',
                borderRadius: '0px',
                transition: 'none',
              }}
              aria-label="GitHub"
            >
              <Github
                size={20}
                className="pixel-art"
                style={{ imageRendering: 'pixelated' }}
              />
            </a>
            <a
              href="#"
              className="flex items-center justify-center border-2 bg-surface text-text-dim hover:text-accent-cyan"
              style={{
                width: '40px',
                height: '40px',
                borderColor: 'var(--border)',
                borderRadius: '0px',
                transition: 'none',
              }}
              aria-label="LinkedIn"
            >
              <Linkedin
                size={20}
                className="pixel-art"
                style={{ imageRendering: 'pixelated' }}
              />
            </a>
            <a
              href="#"
              className="flex items-center justify-center border-2 bg-surface text-text-dim hover:text-accent-cyan"
              style={{
                width: '40px',
                height: '40px',
                borderColor: 'var(--border)',
                borderRadius: '0px',
                transition: 'none',
              }}
              aria-label="Twitter"
            >
              <Twitter
                size={20}
                className="pixel-art"
                style={{ imageRendering: 'pixelated' }}
              />
            </a>
          </div>
        </div>

        {/* Right: Profile Image */}
        <div className="relative flex-shrink-0">
          {/* Pixel Corner Brackets */}
          <div
            className="absolute"
            style={{
              top: '-12px',
              left: '-12px',
              width: '24px',
              height: '24px',
              borderLeft: '4px solid var(--accent-cyan)',
              borderTop: '4px solid var(--accent-cyan)',
            }}
          />
          <div
            className="absolute"
            style={{
              top: '-12px',
              right: '-12px',
              width: '24px',
              height: '24px',
              borderRight: '4px solid var(--accent-cyan)',
              borderTop: '4px solid var(--accent-cyan)',
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: '-12px',
              left: '-12px',
              width: '24px',
              height: '24px',
              borderLeft: '4px solid var(--accent-cyan)',
              borderBottom: '4px solid var(--accent-cyan)',
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: '-12px',
              right: '-12px',
              width: '24px',
              height: '24px',
              borderRight: '4px solid var(--accent-cyan)',
              borderBottom: '4px solid var(--accent-cyan)',
            }}
          />

          {/* Profile Image Container */}
          <div
            className="overflow-hidden bg-surface"
            style={{
              width: '256px',
              height: '256px',
              border: '4px solid var(--border)',
              borderRadius: '0px',
              boxShadow: '4px 4px 0px 0px var(--shadow)',
            }}
          >
            <img
              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Alex&size=320"
              alt="Alex - Pixel Art Avatar"
              className="pixel-art h-full w-full object-cover"
              style={{
                imageRendering: 'pixelated',
                borderRadius: '0px',
              }}
            />
          </div>

          {/* Floating Stats Badges */}
          <div
            className="absolute bg-surface"
            style={{
              bottom: '-16px',
              left: '-32px',
              border: '2px solid var(--border)',
              borderRadius: '0px',
              boxShadow: '2px 2px 0px 0px var(--shadow)',
              padding: '8px 12px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '18px',
                color: 'var(--accent-gold)',
              }}
            >
              5+ Years
            </p>
            <p
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '14px',
                color: 'var(--text-dim)',
              }}
            >
              Experience
            </p>
          </div>
          <div
            className="absolute bg-surface"
            style={{
              top: '-16px',
              right: '-32px',
              border: '2px solid var(--border)',
              borderRadius: '0px',
              boxShadow: '2px 2px 0px 0px var(--shadow)',
              padding: '8px 12px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '18px',
                color: 'var(--accent-cyan)',
              }}
            >
              50+ Projects
            </p>
            <p
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '14px',
                color: 'var(--text-dim)',
              }}
            >
              Completed
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Fade - using stepped gradient for pixel feel */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '96px',
          background:
            'linear-gradient(to top, var(--bg) 0%, var(--bg) 25%, transparent 100%)',
        }}
      />
    </section>
  )
}

export default HeroSection
