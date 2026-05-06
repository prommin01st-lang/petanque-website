import { memo } from 'react';

const PixelHeart = memo(function PixelHeart() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block animate-heartbeat"
    >
      <rect x="4" y="2" width="2" height="2" fill="#FF6B9D" />
      <rect x="10" y="2" width="2" height="2" fill="#FF6B9D" />
      <rect x="2" y="4" width="2" height="2" fill="#FF6B9D" />
      <rect x="4" y="4" width="2" height="2" fill="#FF6B9D" />
      <rect x="6" y="4" width="2" height="2" fill="#FF6B9D" />
      <rect x="8" y="4" width="2" height="2" fill="#FF6B9D" />
      <rect x="10" y="4" width="2" height="2" fill="#FF6B9D" />
      <rect x="12" y="4" width="2" height="2" fill="#FF6B9D" />
      <rect x="2" y="6" width="2" height="2" fill="#FF6B9D" />
      <rect x="4" y="6" width="2" height="2" fill="#FF6B9D" />
      <rect x="6" y="6" width="2" height="2" fill="#FF6B9D" />
      <rect x="8" y="6" width="2" height="2" fill="#FF6B9D" />
      <rect x="10" y="6" width="2" height="2" fill="#FF6B9D" />
      <rect x="12" y="6" width="2" height="2" fill="#FF6B9D" />
      <rect x="4" y="8" width="2" height="2" fill="#FF6B9D" />
      <rect x="6" y="8" width="2" height="2" fill="#FF6B9D" />
      <rect x="8" y="8" width="2" height="2" fill="#FF6B9D" />
      <rect x="10" y="8" width="2" height="2" fill="#FF6B9D" />
      <rect x="6" y="10" width="2" height="2" fill="#FF6B9D" />
      <rect x="8" y="10" width="2" height="2" fill="#FF6B9D" />
      <rect x="7" y="12" width="2" height="2" fill="#FF6B9D" />
    </svg>
  );
});

const GitHubIcon = memo(function GitHubIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.48v-1.7C6.73 20.4 5.8 18.4 5.8 18.4s-.75-1.9-1.84-2.4c0 0-1.5-1.03.1-1.01 0 0 1.64.13 2.54 1.7 1.44 2.53 3.85 1.8 4.79 1.37.15-1.05.58-1.8 1.05-2.23-3.68-.42-7.55-1.84-7.55-8.18 0-1.81.64-3.28 1.7-4.44-.17-.42-.74-2.1.16-4.37 1.35-.42 4.46 1.69 4.46 1.69a15.3 15.3 0 0 1 8.02 0s3.11-2.11 4.46-1.69c.9 2.27.33 3.95.16 4.37 1.05 1.16 1.7 2.63 1.7 4.44 0 6.36-3.88 7.75-7.57 8.17.6.52 1.12 1.54 1.12 3.1v4.57c0 .36.18.69.68.57C19.14 20.6 22 16.76 22 12.26 22 6.58 17.52 2 12 2Z" />
    </svg>
  );
});

const LinkedInIcon = memo(function LinkedInIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S.02 4.88.02 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm8 0H8v16h5v-8.5c0-4.2 6-4.5 6 0V24h5v-10.5c0-8.1-9-7.8-11-3.8V8z" />
    </svg>
  );
});

export default function Footer() {
  return (
    <footer
      className="relative"
      style={{
        backgroundColor: '#0A0A12',
        padding: '48px 24px 24px',
      }}
    >
      {/* Decorative pixel blocks along top border */}
      <div className="absolute top-0 left-0 right-0 flex justify-between overflow-hidden h-2 px-8">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="block w-2 h-2"
            style={{
              backgroundColor: i % 2 === 0 ? '#6C5CE7' : '#FF6B9D',
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Top row: 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 items-center">
          {/* Left: Logo + title */}
          <div className="text-center md:text-left">
            <div className="font-pixel text-[16px] text-warm-white mb-2">PROMMIN.L</div>
            <div className="font-mono-labels text-[18px] text-mid-gray">
              Full-Stack Developer & DevOps
            </div>
          </div>

          {/* Center: Social links */}
          <div className="flex items-center justify-center gap-6">
            <a
              href="https://github.com/prommin01st-lang"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mid-gray hover:text-neon-cyan transition-colors duration-200"
              aria-label="GitHub"
            >
              <GitHubIcon />
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mid-gray hover:text-neon-cyan transition-colors duration-200"
              aria-label="LinkedIn"
            >
              <LinkedInIcon />
            </a>
          </div>

          {/* Right: Built with */}
          <div className="text-center md:text-right font-mono-labels text-[18px] text-mid-gray">
            Built with{' '}
            <PixelHeart />{' '}
            + .NET & Next.js
          </div>
        </div>

        {/* Bottom row: Copyright */}
        <div className="text-center pt-6" style={{ borderTop: '1px solid rgba(138, 133, 152, 0.15)' }}>
          <span className="font-mono-labels text-[16px] text-mid-gray">
            &copy; 2025 Prommin L.
          </span>
        </div>
      </div>
    </footer>
  );
}
