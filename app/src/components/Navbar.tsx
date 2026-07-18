import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';

const navLinks = [
  { key: 'about', href: '#about' },
  { key: 'projects', href: '#projects' },
  { key: 'skills', href: '#skills' },
] as const;

interface NavbarProps {
  is3DEnabled?: boolean;
  onToggle3D?: () => void;
}

export default function Navbar({ is3DEnabled = true, onToggle3D }: NavbarProps) {
  const { lang, t, toggleLang } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = navLinks.map((l) => l.href.slice(1));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            setActiveSection(sections[i]);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const langToggle = (
    <button
      onClick={toggleLang}
      className="font-mono text-[13px] tracking-[0.05em] transition-colors duration-200"
      aria-label="Toggle language"
    >
      <span style={{ color: lang === 'en' ? '#00E5FF' : '#6B7A90' }}>EN</span>
      <span className="text-hud-border"> | </span>
      <span style={{ color: lang === 'th' ? '#00E5FF' : '#6B7A90' }}>TH</span>
    </button>
  );

  const render3DToggle = onToggle3D && (
    <button
      onClick={onToggle3D}
      className="font-mono text-[13px] tracking-[0.05em] transition-colors duration-200 hover:text-neon-cyan"
      aria-label="Toggle 3D backdrop"
      style={{ color: is3DEnabled ? '#00E5FF' : '#6B7A90' }}
    >
      3D: {is3DEnabled ? 'ON' : 'OFF'}
    </button>
  );

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-6 md:px-20"
        style={{
          backgroundColor: 'rgba(5, 8, 13, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1E2A38',
        }}
      >
        {/* Logo — shell prompt */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center font-mono text-[15px]"
        >
          <span className="text-terminal-green">~</span>
          <span className="text-text-dim">/</span>
          <span className="text-text">prommin-l</span>
          <span className="text-neon-cyan ml-1">$</span>
          <span className="inline-block w-2 h-4 bg-neon-cyan animate-blink-cursor ml-1.5" />
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.key}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="nav-link-hud"
                style={
                  isActive
                    ? { color: '#00E5FF', textShadow: '0 0 12px rgba(0, 229, 255, 0.5)' }
                    : undefined
                }
              >
                <span className="text-cyan-dim mr-1">{'//'}</span>
                {t.nav[link.key]}
              </a>
            );
          })}
          {render3DToggle}
          {onToggle3D && <span className="text-hud-border"> | </span>}
          {langToggle}
        </div>

        {/* Hamburger button */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <motion.span
            className="block w-6 bg-text"
            style={{ height: '2px' }}
            animate={mobileOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="block w-6 bg-text"
            style={{ height: '2px' }}
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="block w-6 bg-text"
            style={{ height: '2px' }}
            animate={mobileOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          />
        </button>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[99] md:hidden flex flex-col items-center justify-center gap-8"
            style={{ backgroundColor: 'rgba(5, 8, 13, 0.97)' }}
          >
            {navLinks.map((link, i) => (
              <motion.a
                key={link.key}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="font-mono text-[22px] text-text hover:text-neon-cyan transition-colors duration-200"
              >
                <span className="text-cyan-dim mr-2">{'//'}</span>
                {t.nav[link.key]}
              </motion.a>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: navLinks.length * 0.08 }}
              className="font-mono text-[18px] flex flex-col items-center gap-4"
            >
              {render3DToggle}
              {onToggle3D && <div className="w-8 h-px bg-hud-border" />}
              {langToggle}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
