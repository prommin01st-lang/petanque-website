import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setCsrfToken } from '@/lib/api';
import { useI18n } from '@/i18n/I18nContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import useMe from './useMe';
import CommandPalette from './CommandPalette';
import { DirtyGuardContext, type DirtyGuard } from './dirtyGuard';
import { clearDrafts } from './posts/useAutosave';

/* ------------------------------------------------------------------ */
/*  Admin shell: sidebar (top scroll row on mobile) + top bar + outlet */
/* ------------------------------------------------------------------ */

const SECTIONS = ['projects', 'posts', 'media', 'settings', 'audit'] as const;

export default function AdminLayout() {
  const { t, lang, setLang } = useI18n();
  const { data: me } = useMe();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const section = pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'projects';

  useEffect(() => {
    document.title = `admin — ${section}`;
  }, [section]);

  // Unsaved-changes guard for sidebar navigation (see dirtyGuard.ts for why not useBlocker).
  const dirtyRef = useRef(false);
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const guard = useMemo<DirtyGuard>(
    () => ({
      setDirty: (d) => {
        dirtyRef.current = d;
      },
      leave: (to) => {
        if (dirtyRef.current) setPendingTo(to);
        else navigate(to);
      },
    }),
    [navigate],
  );

  function confirmLeave() {
    const to = pendingTo;
    dirtyRef.current = false;
    setPendingTo(null);
    if (to) navigate(to);
  }

  const [logoutFailed, setLogoutFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    setLogoutFailed(false);
    try {
      await api.auth.logout();
    } catch (err) {
      // 401 = already logged out server-side; anything else means the session may still be alive.
      if (!(err instanceof ApiError && err.status === 401)) {
        setLogoutFailed(true);
        setLoggingOut(false);
        return;
      }
    }
    setCsrfToken(null);
    clearDrafts();
    queryClient.clear();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-[100dvh] grid grid-rows-[auto_auto_1fr] md:grid-rows-[auto_1fr] md:grid-cols-[180px_1fr] bg-bg text-text font-mono">
      <header className="md:col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hud-border px-4 py-3 text-sm">
        <p className="m-0 min-w-0 truncate">
          <span className="font-bold text-prompt-user">admin@petanque21st</span>
          <span className="text-text">:</span>
          <span className="font-bold text-prompt-path">~/admin/{section}</span>
          <span className="text-text">$</span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          {me && (
            <span className="chip chip-green">
              {t.admin.via} {t.admin.method[me.authMethod]}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs" role="group" aria-label={t.admin.language}>
            {(['en', 'th'] as const).map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                {i > 0 && <span className="text-text-dim">|</span>}
                <button
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={lang === l ? 'text-ansi-bright-cyan' : 'text-text-dim hover:text-text'}
                >
                  {l.toUpperCase()}
                </button>
              </span>
            ))}
          </span>
          <button type="button" onClick={() => void logout()} disabled={loggingOut} className="text-danger hover:underline">
            [{t.admin.logout}]
          </button>
        </div>
        {logoutFailed && (
          <p role="alert" className="basis-full m-0 text-xs text-danger">
            ERR: {t.admin.logoutFailed}
          </p>
        )}
      </header>

      <nav
        aria-label={t.admin.navLabel}
        className="flex md:flex-col gap-1 overflow-x-auto border-b md:border-b-0 md:border-r border-hud-border px-2 py-2 md:py-4"
      >
        {SECTIONS.map((s) => (
          <NavLink
            key={s}
            to={`/admin/${s}`}
            onClick={(e) => {
              // Modified / non-primary clicks open a new tab: nothing is lost here, let them through.
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              if (dirtyRef.current) {
                e.preventDefault();
                setPendingTo(`/admin/${s}`);
              }
            }}
            className={({ isActive }) =>
              `shrink-0 whitespace-nowrap px-2 py-1 text-sm ${
                isActive ? 'bg-ansi-bright-cyan text-bg' : 'text-text-dim hover:text-ansi-bright-cyan'
              }`
            }
          >
            [ {t.admin.nav[s]} ]
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0 p-4 md:p-6">
        <DirtyGuardContext.Provider value={guard}>
          <Outlet />
        </DirtyGuardContext.Provider>
      </main>

      <CommandPalette onNavigate={guard.leave} onLogout={() => void logout()} />

      <AlertDialog open={pendingTo !== null} onOpenChange={(o) => !o && setPendingTo(null)}>
        <AlertDialogContent className="bg-surface border-hud-border font-mono">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.admin.leave.title}</AlertDialogTitle>
            <AlertDialogDescription>{t.admin.leave.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.admin.leave.stay}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>{t.admin.leave.discard}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
