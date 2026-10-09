import { useCallback, useEffect, useRef, useState } from 'react';

interface Stored<T> {
  value: T;
  savedAt: number;
}

function read<T>(key: string): Stored<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored<T>> | null;
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed) || typeof parsed.savedAt !== 'number') return null;
    return { value: parsed.value as T, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to remove */
  }
}

/**
 * Periodically snapshots `value` to localStorage while `dirty`. On mount, an existing
 * snapshot is exposed as `restore` (with its `savedAt`) so the caller can offer it.
 */
export function useAutosave<T>(key: string, value: T, dirty: boolean, intervalMs = 5000) {
  const [found, setFound] = useState<Stored<T> | null>(() => read<T>(key));
  const latest = useRef(value);
  // Set by clear(): skip the next tick (or until the value changes), so a tick racing a
  // successful save cannot re-write the snapshot that was just cleared. If the form is still
  // dirty afterwards (edits typed while the save was in flight), the following tick saves them.
  const suppress = useRef(false);

  useEffect(() => {
    latest.current = value;
    suppress.current = false;
  }, [value]);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setInterval(() => {
      if (suppress.current) {
        suppress.current = false;
        return;
      }
      try {
        localStorage.setItem(key, JSON.stringify({ value: latest.current, savedAt: Date.now() }));
      } catch {
        /* quota exceeded or storage blocked — autosave is best-effort */
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [key, dirty, intervalMs]);

  const clear = useCallback(() => {
    remove(key);
    suppress.current = true;
    setFound(null);
  }, [key]);
  const discard = useCallback(() => {
    remove(key);
    setFound(null);
  }, [key]);

  return { restore: found ? found.value : null, savedAt: found ? found.savedAt : null, discard, clear };
}

/** Writes a snapshot directly (e.g. to hand unsaved edits to an editor that is about to mount). */
export function writeDraft<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    /* best-effort */
  }
}

/** Removes every autosaved draft with the given key prefix (called on logout). */
export function clearDrafts(prefix = 'draft:post:') {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable */
  }
}
