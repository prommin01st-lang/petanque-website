import { createContext, useCallback, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/*
 * In-app "unsaved changes" guard. react-router's useBlocker needs a data router, but the app
 * uses <BrowserRouter>, so instead the admin shell (AdminLayout) provides this context and
 * consults it before its own sidebar navigation; editors register their dirty state here.
 */
export interface DirtyGuard {
  setDirty: (dirty: boolean) => void;
  /** Navigate to `to`, asking for confirmation first when the current editor is dirty. */
  leave: (to: string) => void;
}

export const DirtyGuardContext = createContext<DirtyGuard | null>(null);

/**
 * Registers `dirty` with the admin shell, adds a `beforeunload` prompt while dirty, and returns a
 * guarded `leave(to)` for the editor's own links. Outside the shell it falls back to window.confirm.
 */
export function useDirtyGuard(dirty: boolean, confirmMessage: string): (to: string) => void {
  const guard = useContext(DirtyGuardContext);
  const navigate = useNavigate();

  useEffect(() => {
    guard?.setDirty(dirty);
    return () => guard?.setDirty(false);
  }, [guard, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return useCallback(
    (to: string) => {
      if (guard) guard.leave(to);
      else if (!dirty || window.confirm(confirmMessage)) navigate(to);
    },
    [guard, dirty, confirmMessage, navigate],
  );
}
