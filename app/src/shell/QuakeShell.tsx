import { useCallback, useEffect, useRef, useState } from 'react';
import type { Terminal } from '@xterm/xterm';
import { useI18n } from '@/i18n/I18nContext';
import { TerminalWindow, LoadingBar, ErrorLine } from '@/components/term';
import { STATUS_BAR_PX } from '@/statusbar/constants';
import { loadXterm, type XtermModules } from './loadXterm';
import { xtermTheme } from './xtermTheme';
import { createReadline } from './readline';
import { run, COMMAND_NAMES } from './commands';
import { complete } from './complete';
import { bold, color } from './ansi';
import { useShellContext } from './useShellContext';
import { classifyUrl } from './safeUrl';
import type { ShellContext } from './types';

const HISTORY_KEY = 'shell-history';
const WELCOMED_KEY = 'shell-welcomed';
const HISTORY_CAP = 100;

function loadHistory(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string').slice(-HISTORY_CAP) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: readonly string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_CAP)));
  } catch {
    /* storage unavailable */
  }
}

/** True once per browser session; marks the session as welcomed. */
function firstVisit(): boolean {
  try {
    if (sessionStorage.getItem(WELCOMED_KEY)) return false;
    sessionStorage.setItem(WELCOMED_KEY, '1');
  } catch {
    /* storage unavailable: show the banner */
  }
  return true;
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* -------------------------------------------------------------------------- */
/* Quake-style drop-down shell: xterm.js + readline + the command set.        */
/* The Terminal is created once and kept while mounted; closing only hides.   */
/* -------------------------------------------------------------------------- */

type WindowMode = 'normal' | 'minimized' | 'maximized';

export default function QuakeShell({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [reducedMotion] = useState(prefersReducedMotion);
  const [mods, setMods] = useState<XtermModules | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<WindowMode>('normal');
  // Reopening a minimized shell shows it again (derived during render, no effect needed).
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open && mode === 'minimized') setMode('normal');
  }
  const [cwd, setCwdState] = useState('~');
  const [history] = useState(loadHistory);
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<{ fit(): void } | null>(null);
  // The prompt is redrawn synchronously after a command, before React re-renders.
  const cwdRef = useRef('~');

  const setCwd = useCallback((p: string) => {
    cwdRef.current = p;
    setCwdState(p);
  }, []);
  const clear = useCallback(() => termRef.current?.clear(), []);

  const ctx = useShellContext({ cwd, setCwd, history, clear, close: onClose });
  const ctxRef = useRef<Omit<ShellContext, 'signal'>>(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  /* Load xterm (again on retry). */
  useEffect(() => {
    let cancelled = false;
    loadXterm().then(
      (m) => {
        if (!cancelled) setMods(m);
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(err ?? new Error('load failed'));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  /* Create the terminal once xterm is loaded. */
  useEffect(() => {
    const host = hostRef.current;
    if (!mods || !host) return;
    const { Terminal, FitAddon, WebLinksAddon, UnicodeGraphemesAddon } = mods;

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      theme: xtermTheme(),
      cursorBlink: !reducedMotion,
      screenReaderMode: true,
      allowProposedApi: true,
      convertEol: false,
    });
    termRef.current = term;

    // Every link (OSC-8 and auto-detected) goes through the shared URL guard; rejects are ignored.
    const openLink = (url: string) => {
      const c = classifyUrl(url);
      const ctxNow = ctxRef.current;
      if (c.kind === 'internal') {
        ctxNow.navigate(c.path);
        ctxNow.close();
      } else if (c.kind === 'external') {
        ctxNow.openExternal(c.url);
      }
    };

    const fit = new FitAddon();
    fitRef.current = fit;
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon((_e: MouseEvent, uri: string) => openLink(uri)));
    term.loadAddon(new UnicodeGraphemesAddon());
    term.unicode.activeVersion = '15-graphemes';
    term.options.linkHandler = { activate: (_e: MouseEvent, text: string) => openLink(text) };

    term.open(host);
    try {
      fit.fit();
    } catch {
      /* not measurable yet */
    }

    // xterm stops propagation of keys it handles, so Escape is caught here, not on window.
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if (e.type === 'keydown' && e.key === 'Escape') {
        ctxRef.current.close();
        return false;
      }
      return true;
    });

    const rl = createReadline({
      port: {
        write: (d) => term.write(d),
        get cols() {
          return term.cols;
        },
      },
      prompt: () => `${bold(color('guest@prommin', 'green', true))}:${bold(color(cwdRef.current, 'blue', true))}$ `,
      onLine: async (line, signal) => {
        const out = await run(line, { ...ctxRef.current, signal });
        saveHistory(history);
        return out;
      },
      complete: async (line, cursor) => {
        try {
          return await complete(line, cursor, COMMAND_NAMES, cwdRef.current, ctxRef.current.data);
        } catch {
          return { replaceFrom: cursor, options: [] };
        }
      },
      onClear: () => term.clear(),
      history,
      spinner: !reducedMotion,
    });

    const sub = term.onData((d) => {
      if (d === '`' && !rl.busy && rl.line === '') {
        ctxRef.current.close();
        return;
      }
      rl.feed(d);
    });

    if (firstVisit()) {
      const { t: tt } = ctxRef.current;
      term.write(`${bold(tt.shell.welcome)}\r\n${tt.shell.hint}\r\n\r\n`);
    }
    rl.showPrompt();

    const ro =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            try {
              fit.fit();
            } catch {
              /* hidden */
            }
          })
        : null;
    ro?.observe(host);

    return () => {
      ro?.disconnect();
      sub.dispose();
      rl.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [mods, history, reducedMotion]);

  /* On open: refit and focus the terminal. */
  useEffect(() => {
    if (!open || !mods) return;
    try {
      fitRef.current?.fit();
    } catch {
      /* not measurable */
    }
    termRef.current?.focus();
  }, [open, mods]);

  const retry = () => {
    setLoadError(null);
    setAttempt((a) => a + 1);
  };

  return (
    <>
      {open && mode !== 'minimized' && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          onClick={onClose}
        />
      )}
      <div
        role="dialog"
        aria-label={t.statusBar.shell}
        aria-hidden={!open}
        inert={!open}
        data-mode={mode}
        // pt-12 keeps the window's title bar clear of the fixed navbar (h-12, z-[100]).
        className={`fixed inset-x-0 top-0 z-50 pt-12 px-2 sm:px-4 pb-2 ${mode === 'normal' ? 'h-[70vh] sm:h-[50vh]' : mode === 'minimized' ? 'h-auto' : ''}`}
        onClick={(e) => {
          // A minimized window restores when its title bar is clicked.
          if (mode === 'minimized' && !(e.target as HTMLElement).closest('button')) setMode('normal');
        }}
        style={{
          ...(mode === 'maximized' ? { height: `calc(100dvh - ${STATUS_BAR_PX}px)` } : {}),
          transform: open ? 'translateY(0)' : 'translateY(-100%)',
          visibility: open ? 'visible' : 'hidden',
          // Visible immediately on open (so xterm can take focus); hidden only after the slide-up.
          transition: reducedMotion
            ? 'none'
            : open
              ? 'transform 180ms ease-out'
              : 'transform 180ms ease-out, visibility 0s linear 180ms',
        }}
      >
        <TerminalWindow
          title={cwd}
          onClose={onClose}
          onMinimize={() => setMode((m) => (m === 'minimized' ? 'normal' : 'minimized'))}
          onMaximize={() => setMode((m) => (m === 'maximized' ? 'normal' : 'maximized'))}
          minimized={mode === 'minimized'}
          maximized={mode === 'maximized'}
          labels={{ close: t.statusBar.closeShell, minimize: t.shell.minimize, maximize: t.shell.maximize, restore: t.shell.restore }}
          className="h-full [&>.term-window-body]:min-h-0 [&>.term-window-body]:p-2"
        >
          <div className="relative h-full">
            {!mods && !loadError && <LoadingBar label={t.common.loading} />}
            {loadError != null && (
              <ErrorLine
                error={loadError}
                fallbackMessage={t.shell.loadFailed}
                retryLabel={t.common.retry.toLowerCase()}
                onRetry={retry}
              />
            )}
            <div ref={hostRef} className="h-full w-full" />
          </div>
        </TerminalWindow>
      </div>
    </>
  );
}
