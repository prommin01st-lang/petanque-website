import { useEffect, useState } from 'react';
import { useLocation, type NavigateFunction } from 'react-router-dom';

export const SECTIONS = ['hero', 'about', 'projects', 'skills', 'blog'] as const;
export type SectionId = (typeof SECTIONS)[number];
const OFFSET = 120;

function current(): SectionId {
  let id: SectionId = 'hero';
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    // Bottom of the page: short trailing sections can never reach the top offset.
    for (const s of SECTIONS) if (document.getElementById(s)) id = s;
    return id;
  }
  for (const s of SECTIONS) {
    const el = document.getElementById(s);
    if (el && el.getBoundingClientRect().top <= OFFSET) id = s;
  }
  return id;
}

export function useActiveSection(): SectionId {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [id, setId] = useState<SectionId>(() => (isHome ? current() : 'hero'));
  useEffect(() => {
    if (!isHome) return;
    const on = () => setId(current());
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [isHome]);
  if (pathname.startsWith('/blog')) return 'blog';
  return isHome ? id : 'hero';
}

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function goToSection(id: SectionId, navigate: NavigateFunction, pathname: string): void {
  if (pathname === '/') {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
      history.replaceState(history.state, '', id === 'hero' ? '/' : `/#${id}`);
      return;
    }
    if (id === 'blog') navigate('/blog');
    return;
  }
  navigate(id === 'hero' ? '/' : `/#${id}`);
}
