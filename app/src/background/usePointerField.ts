import { useEffect, useRef } from 'react';

export interface PointerField {
  /** Current pointer position, CSS px (top-left origin). */
  x: number;
  y: number;
  /** Position at the previous event. */
  px: number;
  py: number;
  /** Pointer is over the window and moved within the last 2 s. */
  active: boolean;
  /** performance.now() of the last event. */
  t: number;
}

export const POINTER_IDLE_MS = 2000;

/** Whether the field should still count as active at `now`. */
export function pointerActive(field: PointerField, now: number): boolean {
  return field.active && now - field.t < POINTER_IDLE_MS;
}

/**
 * Tracks the pointer via passive window listeners (mouse, pen and touch), so
 * the background canvas itself can stay `pointer-events: none`.
 */
export function usePointerField() {
  const ref = useRef<PointerField>({ x: -1e4, y: -1e4, px: -1e4, py: -1e4, active: false, t: 0 });

  useEffect(() => {
    const field = ref.current;
    const onMove = (e: PointerEvent) => {
      if (field.active) {
        field.px = field.x;
        field.py = field.y;
      } else {
        field.px = e.clientX;
        field.py = e.clientY;
      }
      field.x = e.clientX;
      field.y = e.clientY;
      field.active = true;
      field.t = performance.now();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.type === 'pointerout' && e.relatedTarget) return;
      field.active = false;
    };
    const onBlur = () => {
      field.active = false;
    };
    const opts = { passive: true } as const;
    window.addEventListener('pointermove', onMove, opts);
    window.addEventListener('pointerdown', onMove, opts);
    window.addEventListener('pointerout', onLeave, opts);
    document.documentElement.addEventListener('pointerleave', onLeave, opts);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      window.removeEventListener('pointerout', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return ref;
}
