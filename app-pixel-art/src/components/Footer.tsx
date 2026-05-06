import React from 'react'
import { Heart } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <footer
      className="border-t-2"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div
        className="mx-auto max-w-6xl px-6"
        style={{ paddingTop: '32px', paddingBottom: '32px' }}
      >
        {/* Decorative Pixel Blocks */}
        <div
          className="flex justify-center"
          style={{ gap: '8px', marginBottom: '24px' }}
        >
          <div
            className="bg-accent-cyan"
            style={{
              width: '4px',
              height: '4px',
              imageRendering: 'pixelated',
            }}
          />
          <div
            className="bg-accent-magenta"
            style={{
              width: '4px',
              height: '4px',
              imageRendering: 'pixelated',
            }}
          />
          <div
            className="bg-accent-gold"
            style={{
              width: '4px',
              height: '4px',
              imageRendering: 'pixelated',
            }}
          />
          <div
            className="bg-accent-cyan"
            style={{
              width: '4px',
              height: '4px',
              imageRendering: 'pixelated',
            }}
          />
          <div
            className="bg-accent-magenta"
            style={{
              width: '4px',
              height: '4px',
              imageRendering: 'pixelated',
            }}
          />
        </div>

        <div
          className="flex flex-col items-center justify-between sm:flex-row"
          style={{ gap: '16px' }}
        >
          {/* Logo */}
          <span
            className="text-text-dim"
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '10px',
              letterSpacing: '0.04em',
            }}
          >
            PETANQUE
          </span>

          {/* Copyright */}
          <p
            className="text-text-dim"
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: '18px',
            }}
          >
            &copy; 2024 Petanque. Built with
            <Heart
              size={16}
              className="inline"
              style={{
                color: 'var(--accent-magenta)',
                imageRendering: 'pixelated',
                marginLeft: '4px',
                marginRight: '4px',
                animation: 'pulse-accent 0.8s steps(2) infinite',
              }}
              fill="#FF7EDB"
            />
            and pixels.
          </p>

          {/* Social Links */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            <a
              href="#"
              className="link-pixel"
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '18px',
              }}
            >
              GitHub
            </a>
            <a
              href="#"
              className="link-pixel"
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '18px',
              }}
            >
              LinkedIn
            </a>
            <a
              href="#"
              className="link-pixel"
              style={{
                fontFamily: 'var(--font-label)',
                fontSize: '18px',
              }}
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
