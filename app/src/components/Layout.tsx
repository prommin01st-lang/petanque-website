import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh]">
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
