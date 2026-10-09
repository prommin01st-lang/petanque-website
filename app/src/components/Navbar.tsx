import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import type { Language } from '@/i18n/translations';
import { useActiveSection } from '@/hooks/useActiveSection';
import { useShell } from '@/shell/useShell';

const sectionLinks = [
  { key: 'about', href: '#about' },
  { key: 'projects', href: '#projects' },
  { key: 'skills', href: '#skills' },
] as const;

const LANGS: Language[] = ['en', 'th'];

/** Tailwind `md` breakpoint (the desktop tabs take over from here). */
const MD_UP = '(min-width: 768px)';

interface NavbarProps {
  fxEnabled?: boolean;
  /** Reduced motion is on: fx cannot be enabled, so the toggle is disabled. */
  fxLocked?: boolean;
  onToggleFx?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Navbar — one-line terminal tab bar                                 */
/* ------------------------------------------------------------------ */

export default function Navbar({ fxEnabled = true, fxLocked = false, onToggleFx }: NavbarProps) {
  const { lang, t, setLang } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const onBlog = pathname.startsWith('/blog');

  const activeSection = useActiveSection();
  const shell = useShell();

  /* Any route change (incl. browser back/forward) closes the overlay. */
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMobileOpen(false);
  }

  /* Growing past the md breakpoint hides the overlay via CSS; close it so inert/scroll-lock are released. */
  useEffect(() => {
    if (!mobileOpen || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(MD_UP);
    const onChange = (e: { matches: boolean }) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mobileOpen]);

  /* Close the mobile overlay; when it was open, hand focus back to [ menu ] */
  const closeMenu = () => {
    if (!mobileOpen) return;
    setMobileOpen(false);
    menuButtonRef.current?.focus({ preventScroll: true });
  };

  /*
    While the overlay is open: focus moves into it, the page behind is
    inert (main + footer), body scroll is locked and Escape closes it.
  */
  useEffect(() => {
    if (!mobileOpen) return;
    overlayRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    const behind = Array.from(document.querySelectorAll<HTMLElement>('main, footer'));
    behind.forEach((el) => el.setAttribute('inert', ''));
    const prevOverflow = document.body.style.overflow;
    document.body.style.setProperty('overflow', 'hidden');

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMobileOpen(false);
      menuButtonRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      behind.forEach((el) => el.removeAttribute('inert'));
      document.body.style.setProperty('overflow', prevOverflow);
    };
  }, [mobileOpen]);

  /* `hash` is set for in-page section links; blog links just navigate */
  const handleLinkClick = (e: React.MouseEvent, hash?: string) => {
    closeMenu();
    if (shell.open) shell.close();
    if (!hash || !isHome) return; // router navigation; HomePage scrolls to the hash
    e.preventDefault();
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
  };

  const links = [
    ...sectionLinks.map((l) => ({
      key: l.key,
      to: `/${l.href}`,
      label: t.nav[l.key],
      active: isHome && activeSection === l.href.slice(1),
      hash: l.href as string | undefined,
    })),
    {
      key: 'blog',
      to: '/blog',
      label: t.nav.blog,
      active: onBlog,
      hash: undefined,
    },
  ];

  const langToggle = (
    <div role="group" aria-label={t.nav.language} className="flex items-center">
      {LANGS.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden="true" className="text-hud-border">|</span>}
          <button
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={`px-1 transition-colors duration-200 ${lang === l ? 'text-ansi-bright-cyan' : 'text-text-dim hover:text-text'}`}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );

  const toggleFx = onToggleFx && (
    <button
      type="button"
      onClick={onToggleFx}
      aria-label={t.nav.toggleFx}
      disabled={fxLocked}
      title={fxLocked ? t.nav.fxReducedMotion : undefined}
      aria-pressed={fxEnabled}
      className={`transition-colors duration-200 hover:text-ansi-bright-cyan disabled:cursor-not-allowed disabled:hover:text-text-dim ${fxEnabled ? 'text-ansi-bright-green' : 'text-text-dim'}`}
    >
      {fxEnabled ? '[fx:on]' : '[fx:off]'}
    </button>
  );

  const shellButton = (
    <button
      type="button"
      onClick={(e) => {
        if (shell.open) {
          shell.close();
          return;
        }
        // From the mobile overlay, close it and return focus to [ menu ] when the shell closes.
        const opener = mobileOpen ? menuButtonRef.current : e.currentTarget;
        setMobileOpen(false);
        shell.openShell(opener);
      }}
      aria-pressed={shell.open}
      aria-label={shell.open ? t.statusBar.closeShell : t.statusBar.openShell}
      className={`transition-colors duration-200 hover:text-ansi-bright-cyan ${shell.open ? 'text-ansi-bright-cyan' : 'text-ansi-bright-green'}`}
    >
      [ &gt;_ {t.statusBar.shell} ]
    </button>
  );

  return (
    <>
      <nav
        aria-label={t.nav.main}
        className="fixed top-0 inset-x-0 z-[100] h-12 flex items-center gap-4 px-4 sm:px-6 md:px-10 font-mono text-[13px] border-b border-hud-border"
        style={{
          backgroundColor: 'rgba(12, 12, 12, 0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {/* Prompt logo */}
        <Link
          to="/"
          onClick={() => {
            setMobileOpen(false);
            if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center shrink-0 text-[14px]"
        >
          <span className="font-bold text-prompt-user">~</span>
          <span className="text-text">/</span>
          <span className="font-bold text-prompt-path">petanque21st</span>
          <span className="text-text ml-1">$</span>
          <span aria-hidden="true" className="inline-block w-2 h-4 bg-text animate-blink-cursor ml-1.5" />
        </Link>

        {/* Desktop tabs */}
        <ul className="hidden md:flex items-center gap-1 ml-4 list-none p-0 m-0">
          {links.map((l) => (
            <li key={l.key}>
              <Link
                to={l.to}
                onClick={(e) => handleLinkClick(e, l.hash)}
                aria-current={l.active ? 'page' : undefined}
                className={`term-tab ${l.active ? 'term-tab-active' : ''}`}
              >
                [ <span className="lowercase">{l.label}</span> ]
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
          {shellButton}
          {langToggle}
          {toggleFx}
        </div>

        {/* Mobile menu button */}
        <button
          ref={menuButtonRef}
          type="button"
          className="md:hidden ml-auto text-ansi-bright-cyan"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {`[ ${mobileOpen ? t.nav.close : t.nav.menu} ]`}
        </button>
      </nav>

      {/* Mobile overlay — `ls` style listing */}
      <div
        ref={overlayRef}
        id="mobile-menu"
        hidden={!mobileOpen}
        className="fixed inset-x-0 top-12 bottom-0 z-[99] md:hidden px-6 py-10 font-mono overflow-y-auto"
        style={{ backgroundColor: 'rgba(12, 12, 12, 0.97)' }}
      >
        <p className="text-[13px] text-text-dim mb-6">
          <span className="font-bold text-prompt-user">guest@petanque21st</span>:<span className="font-bold text-prompt-path">~</span>$ ls
        </p>
        <ul className="list-none p-0 m-0 space-y-5">
          {links.map((l) => (
            <li key={l.key}>
              <Link
                to={l.to}
                onClick={(e) => handleLinkClick(e, l.hash)}
                aria-current={l.active ? 'page' : undefined}
                className={`text-[22px] transition-colors duration-200 ${l.active ? 'text-ansi-bright-cyan' : 'text-text hover:text-ansi-bright-cyan'}`}
              >
                <span className="text-ansi-bright-green">&gt; </span>
                <span className="lowercase">{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 pt-6 border-t border-dashed border-hud-border flex flex-wrap items-center gap-6 text-[15px]">
          {shellButton}
          {langToggle}
          {toggleFx}
        </div>
      </div>
    </>
  );
}
