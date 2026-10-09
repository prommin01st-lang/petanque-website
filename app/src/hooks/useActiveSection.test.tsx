import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useActiveSection, goToSection } from './useActiveSection';

function wrap(path: string) {
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
}
function section(id: string, top: number) {
  const el = document.createElement('section');
  el.id = id;
  el.getBoundingClientRect = () => ({ top } as DOMRect);
  document.body.appendChild(el);
  return el;
}
beforeEach(() => {
  // jsdom reports scrollHeight 0, which would read as "at bottom"; default to mid-page.
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(100000);
});
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

it('picks the last section scrolled past on home', () => {
  section('hero', -800); section('about', -100); section('projects', 400);
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/') });
  expect(result.current).toBe('about');
});

it('updates on scroll', () => {
  const about = section('about', 500);
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/') });
  expect(result.current).toBe('hero');
  about.getBoundingClientRect = () => ({ top: 50 } as DOMRect);
  act(() => { window.dispatchEvent(new Event('scroll')); });
  expect(result.current).toBe('about');
});

it('is blog on blog routes', () => {
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/blog/x') });
  expect(result.current).toBe('blog');
});

it('goToSection navigates home first when off-home', () => {
  const navigate = vi.fn();
  goToSection('skills', navigate, '/blog/x');
  expect(navigate).toHaveBeenCalledWith('/#skills');
});

it('goToSection scrolls in place on home', () => {
  const el = section('skills', 900);
  el.scrollIntoView = vi.fn();
  const navigate = vi.fn();
  goToSection('skills', navigate, '/');
  expect(el.scrollIntoView).toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});

function mockViewport(scrollY: number, innerHeight: number, scrollHeight: number) {
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(scrollY);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(innerHeight);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
}

it('is the last existing section at page bottom even when its top > 120', () => {
  section('hero', -2000); section('skills', -300); section('blog', 400);
  mockViewport(1500, 800, 2300);
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/') });
  expect(result.current).toBe('blog');
});

it('falls back to skills at page bottom when #blog is absent', () => {
  section('hero', -2000); section('skills', 300);
  mockViewport(1500, 800, 2300);
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/') });
  expect(result.current).toBe('skills');
});

it('re-evaluates on resize', () => {
  const about = section('about', 500);
  const { result } = renderHook(() => useActiveSection(), { wrapper: wrap('/') });
  expect(result.current).toBe('hero');
  about.getBoundingClientRect = () => ({ top: 10 } as DOMRect);
  act(() => { window.dispatchEvent(new Event('resize')); });
  expect(result.current).toBe('about');
});
