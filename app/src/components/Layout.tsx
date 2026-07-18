import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Toaster } from '@/components/ui/sonner';

/* Lazy-load the 3D sandbox so three.js stays out of the initial chunk */
const SandboxCanvas = lazy(() => import('@/sandbox/SandboxCanvas'));

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [is3DEnabled, setIs3DEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('3d-enabled');
    return stored === null ? true : stored === 'true';
  });

  const toggle3D = () => {
    setIs3DEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('3d-enabled', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-bg font-body">
      {/* Interactive 3D sandbox backdrop (fixed, z-0) */}
      {is3DEnabled && (
        <Suspense fallback={null}>
          <SandboxCanvas />
        </Suspense>
      )}

      <Navbar is3DEnabled={is3DEnabled} onToggle3D={toggle3D} />

      {/*
        Sections opt out of pointer events at the wrapper level and
        re-enable them on content panels, so empty areas pass clicks
        through to the 3D sandbox behind.
      */}
      <main className="relative z-10">{children}</main>

      <Footer />

      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
