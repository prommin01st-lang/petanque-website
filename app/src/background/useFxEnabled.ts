import { useCallback, useEffect, useState } from 'react';

const KEY = 'fx-enabled';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'false';
  } catch {
    return true;
  }
}

function reducedMotionQuery(): MediaQueryList | null {
  try {
    return typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null;
  } catch {
    return null;
  }
}

/**
 * Animated-background preference. Persisted in localStorage (`fx-enabled`,
 * default on). Always false while the user prefers reduced motion (tracked
 * live); the third element reports that lock so the toggle can be disabled.
 */
export function useFxEnabled(): [enabled: boolean, toggle: () => void, reducedMotion: boolean] {
  const [stored, setStored] = useState(readStored);
  const [reduced, setReduced] = useState(() => reducedMotionQuery()?.matches ?? false);

  useEffect(() => {
    const mql = reducedMotionQuery();
    if (!mql) return;
    const onChange = (e: { matches: boolean }) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setStored((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        /* storage unavailable — keep the in-memory value */
      }
      return next;
    });
  }, []);

  return [stored && !reduced, toggle, reduced];
}
