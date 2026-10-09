import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFxEnabled } from './useFxEnabled';

function mockReducedMotion(reduce: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches: reduce,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  vi.stubGlobal('matchMedia', () => mql);
  return {
    set(next: boolean) {
      mql.matches = next;
      listeners.forEach((fn) => fn({ matches: next }));
    },
    listenerCount: () => listeners.size,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useFxEnabled', () => {
  it('defaults to enabled', () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useFxEnabled());
    expect(result.current[0]).toBe(true);
  });

  it('toggle persists fx-enabled=false and back', () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useFxEnabled());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem('fx-enabled')).toBe('false');
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('fx-enabled')).toBe('true');
  });

  it('reads a stored false', () => {
    mockReducedMotion(false);
    localStorage.setItem('fx-enabled', 'false');
    const { result } = renderHook(() => useFxEnabled());
    expect(result.current[0]).toBe(false);
  });

  it('falls back to the default on a corrupted value', () => {
    mockReducedMotion(false);
    localStorage.setItem('fx-enabled', '{garbage');
    const { result } = renderHook(() => useFxEnabled());
    expect(result.current[0]).toBe(true);
  });

  it('falls back to the default when storage is unavailable', () => {
    mockReducedMotion(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { result } = renderHook(() => useFxEnabled());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
  });

  it('is false when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    localStorage.setItem('fx-enabled', 'true');
    const { result } = renderHook(() => useFxEnabled());
    expect(result.current[0]).toBe(false);
    expect(result.current[2]).toBe(true);
  });

  it('follows reduced-motion changes and unsubscribes on unmount', () => {
    const media = mockReducedMotion(false);
    const { result, unmount } = renderHook(() => useFxEnabled());
    expect(result.current[0]).toBe(true);
    expect(result.current[2]).toBe(false);
    act(() => media.set(true));
    expect(result.current[0]).toBe(false);
    expect(result.current[2]).toBe(true);
    act(() => media.set(false));
    expect(result.current[0]).toBe(true);
    unmount();
    expect(media.listenerCount()).toBe(0);
  });
});
