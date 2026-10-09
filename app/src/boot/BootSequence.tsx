import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { shouldBoot } from './shouldBoot';

const STEP_MS = 250;
const HOLD_MS = 200;
const FADE_MS = 300;

export default function BootSequence() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [active] = useState(() => shouldBoot(pathname));
  const [visible, setVisible] = useState(active);
  const [count, setCount] = useState(0);
  const [fading, setFading] = useState(false);

  const lines = [t.boot.mounted, t.boot.started, t.boot.reached];
  const total = lines.length + 1;

  useEffect(() => {
    if (!active) return;
    try { sessionStorage.setItem('booted', '1'); } catch { /* storage unavailable */ }

    const timers: number[] = [];
    for (let i = 1; i <= total; i++) {
      timers.push(window.setTimeout(() => setCount(i), STEP_MS * i));
    }
    timers.push(window.setTimeout(() => setFading(true), STEP_MS * total + HOLD_MS));
    timers.push(window.setTimeout(() => setVisible(false), STEP_MS * total + HOLD_MS + FADE_MS));

    // Passive listeners; never preventDefault/stopPropagation so the key still reaches others.
    const skip = () => setVisible(false);
    const events = ['keydown', 'pointerdown', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }));

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      events.forEach((e) => window.removeEventListener(e, skip));
    };
  }, [active, total]);

  if (!visible) return null;

  return (
    <div
      data-testid="boot"
      aria-hidden="true"
      className="fixed inset-0 z-[200] bg-bg font-mono text-sm p-6 text-text"
      style={{ opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms linear` }}
    >
      {lines.slice(0, Math.min(count, lines.length)).map((line) => (
        <div key={line} className="whitespace-pre">
          [  <span className="text-ansi-bright-green">OK</span>  ] {line}
        </div>
      ))}
      {count >= total && <div>{t.boot.login}</div>}
      <div className="mt-6 text-text-dim">{t.boot.skip}</div>
    </div>
  );
}
