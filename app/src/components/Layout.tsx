import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-bg font-body">
      {/* CRT Scanline Overlay */}
      <div className="crt-overlay" aria-hidden="true" />

      <Navbar />
      <main
        className="relative z-10"
        style={{
          perspective: '2000px',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
