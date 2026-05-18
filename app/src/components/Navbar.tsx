import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';

const navLinks = [
  { key: 'about', href: '#about' },
  { key: 'projects', href: '#projects' },
  { key: 'skills', href: '#skills' },
  { key: 'contact', href: '#contact' },
] as const;

export default function Navbar() {
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

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-6 md:px-20"
        style={{
          backgroundColor: 'rgba(13, 13, 20, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(138, 133, 152, 0.15)',
        }}
      >
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="8" height="8" fill="#6C5CE7" />
            <rect x="14" y="2" width="8" height="8" fill="#00E5FF" />
            <rect x="2" y="14" width="8" height="8" fill="#FF6B9D" />
            <rect x="14" y="14" width="8" height="8" fill="#FFD93D" />
          </svg>
          <span className="font-pixel text-[14px] text-warm-white tracking-tight">
            PETANQUE
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.href);
              }}
              className="relative font-mono-labels text-[20px] uppercase tracking-[0.05em] transition-colors duration-200"
              style={{ color: activeSection === link.href.slice(1) ? '#00E5FF' : '#F0EDE4' }}
            >
              <span className="flex items-center gap-2">
                <motion.span
                  className="inline-block w-2 h-2 bg-neon-cyan"
                  initial={false}
                  animate={{
                    opacity: activeSection === link.href.slice(1) ? 1 : 0,
                    x: activeSection === link.href.slice(1) ? 0 : -8,
                  }}
                  transition={{ duration: 0.2 }}
                />
                {t.nav[link.key]}
              </span>
              <motion.span
                className="absolute left-0 bottom-0 w-2 h-2 bg-neon-cyan"
                initial={{ opacity: 0, x: -8 }}
                whileHover={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              />
            </a>
          ))}
          <button
            onClick={toggleLang}
            className="font-mono-labels text-[20px] uppercase tracking-[0.05em] transition-colors duration-200"
            style={{ color: '#F0EDE4' }}
          >
            <span style={{ color: lang === 'en' ? '#00E5FF' : '#F0EDE4' }}>EN</span>
            <span style={{ color: '#8A8598' }}> | </span>
            <span style={{ color: lang === 'th' ? '#00E5FF' : '#F0EDE4' }}>TH</span>
          </button>
        </div>

        {/* Hamburger button */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[6px]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <motion.span
            className="block w-6 bg-warm-white"
            style={{ height: '2px' }}
            animate={mobileOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="block w-6 bg-warm-white"
            style={{ height: '2px' }}
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="block w-6 bg-warm-white"
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
            style={{
              backgroundColor: '#0D0D14',
              backgroundImage: 'linear-gradient(rgba(138, 133, 152, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(138, 133, 152, 0.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
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
                className="font-pixel text-[24px] text-warm-white hover:text-neon-cyan transition-colors duration-200"
              >
                {t.nav[link.key]}
              </motion.a>
            ))}
            <motion.button
              onClick={toggleLang}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: navLinks.length * 0.08 }}
              className="font-pixel text-[24px] text-warm-white hover:text-neon-cyan transition-colors duration-200"
            >
              <span style={{ color: lang === 'en' ? '#00E5FF' : '#F0EDE4' }}>EN</span>
              <span style={{ color: '#8A8598' }}> | </span>
              <span style={{ color: lang === 'th' ? '#00E5FF' : '#F0EDE4' }}>TH</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
