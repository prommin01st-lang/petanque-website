import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { ErrorLine } from '@/components/term';
import { ShellCtx, type ShellApi } from './useShell';
import LazyQuake from './LazyQuake';
import ShellChunkBoundary from './ShellChunkBoundary';

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

function inEditable(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE) !== null;
}

/* -------------------------------------------------------------------------- */
/* Owns the shell's open state, the ` shortcut and focus return.             */
/* The panel (and xterm) load lazily on the first open.                       */
/* -------------------------------------------------------------------------- */

export default function ShellProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Bumping `attempt` builds a fresh lazy wrapper (and a fresh boundary), so retry re-imports the chunk.
  const [attempt, setAttempt] = useState(0);
  const { t } = useI18n();
  const openerRef = useRef<HTMLElement | null>(null);
  // Mirrors `open` synchronously so back-to-back calls (key repeat, close + reopen) see the latest value.
  const openRef = useRef(false);

  const openShell = useCallback((opener?: HTMLElement | null) => {
    if (openRef.current) return;
    const active = document.activeElement;
    openerRef.current = opener ?? (active instanceof HTMLElement && active !== document.body ? active : null);
    openRef.current = true;
    setMounted(true);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    const el = openerRef.current;
    openerRef.current = null;
    if (el?.isConnected) el.focus({ preventScroll: true });
  }, []);

  const toggle = useCallback(() => {
    if (openRef.current) close();
    else openShell();
  }, [close, openShell]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && openRef.current) {
        close();
        return;
      }
      if (e.key !== '`' || e.repeat || e.altKey || e.metaKey || inEditable(e.target)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, toggle]);

  const api = useMemo<ShellApi>(() => ({ open, toggle, openShell, close }), [open, toggle, openShell, close]);

  return (
    <ShellCtx.Provider value={api}>
      {children}
      {mounted && (
        <ShellChunkBoundary
          key={attempt}
          fallback={(error) =>
            open ? (
              <div className="fixed inset-x-0 top-0 z-[150] bg-bg border-b border-hud-border p-4">
                <ErrorLine
                  error={error}
                  fallbackMessage={t.shell.loadFailed}
                  retryLabel={t.common.retry}
                  onRetry={() => setAttempt((n) => n + 1)}
                />
              </div>
            ) : null
          }
        >
          <Suspense fallback={null}>
            <LazyQuake attempt={attempt} open={open} onClose={close} />
          </Suspense>
        </ShellChunkBoundary>
      )}
    </ShellCtx.Provider>
  );
}
