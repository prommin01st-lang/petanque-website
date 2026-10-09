import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { SECTIONS, goToSection, useActiveSection } from '@/hooks/useActiveSection';
import { useShell } from '@/shell/useShell';
import { STATUS_BAR_PX } from './constants';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-bg';

const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

function useClock(): string {
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(fmt());
      id = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    };
    id = setTimeout(tick, 60_000 - (Date.now() % 60_000));
    return () => clearTimeout(id);
  }, []);
  return now;
}

export default function StatusBar() {
  const { open: shellOpen, openShell, close } = useShell();
  const { t, lang, setLang } = useI18n();
  const active = useActiveSection();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const clock = useClock();
  const idx = SECTIONS.indexOf(active);
  const go = (i: number) => goToSection(SECTIONS[(i + SECTIONS.length) % SECTIONS.length], navigate, pathname);

  return (
    <nav
      aria-label={t.statusBar.label}
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-2 font-mono text-[12px] leading-none bg-ansi-green text-bg"
      style={{ height: STATUS_BAR_PX }}
    >
      <span aria-hidden="true">[petanque21st]</span>
      <span className="hidden sm:flex gap-3">
        {SECTIONS.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-current={s === active ? 'true' : undefined}
            className={`${FOCUS} ${s === active ? 'font-bold' : ''}`}
            onClick={() => go(i)}
          >
            {i}:{t.statusBar.windows[s]}{s === active ? '*' : ''}
          </button>
        ))}
      </span>
      <span className="flex sm:hidden gap-2 items-center">
        <span>[{idx}:{t.statusBar.windows[active]}*]</span>
        <button type="button" className={FOCUS} aria-label={t.statusBar.prev} onClick={() => go(idx - 1)}>‹</button>
        <button type="button" className={FOCUS} aria-label={t.statusBar.next} onClick={() => go(idx + 1)}>›</button>
      </span>
      <span className="ml-auto flex items-center gap-3">
        <button
          type="button"
          aria-pressed={shellOpen}
          onClick={(e) => (shellOpen ? close() : openShell(e.currentTarget))}
          aria-label={shellOpen ? t.statusBar.closeShell : t.statusBar.openShell}
          className={`${FOCUS} ${shellOpen ? 'font-bold underline' : ''}`}
        >
          &gt;_ {t.statusBar.shell}
        </button>
        <span aria-hidden="true">│</span>
        <span className="flex gap-1">
          {(['en', 'th'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={`${FOCUS} ${lang === l ? 'font-bold' : ''}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </span>
        <span aria-hidden="true" className="hidden sm:inline">│ {clock}</span>
      </span>
    </nav>
  );
}
