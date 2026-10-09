import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { Toaster } from '@/components/ui/sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import AsciiBackground from '@/background/AsciiBackground';
import StaticAsciiBackdrop from '@/background/StaticAsciiBackdrop';
import StatusBar from '@/statusbar/StatusBar';
import { STATUS_BAR_PX } from '@/statusbar/constants';
import { useFxEnabled } from '@/background/useFxEnabled';
import ShellProvider from '@/shell/ShellProvider';
import BootSequence from '@/boot/BootSequence';

export default function Layout() {
  return (
    <ShellProvider>
      <LayoutInner />
    </ShellProvider>
  );
}

function LayoutInner() {
  const [fx, toggleFx, reducedMotion] = useFxEnabled();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-[100dvh] bg-bg font-body" style={{ paddingBottom: STATUS_BAR_PX }}>
      {/* ASCII backdrop (fixed, z-0, pointer-events none — input comes from window listeners) */}
      {fx ? <AsciiBackground cell={isMobile ? 10 : 8} /> : <StaticAsciiBackdrop />}

      <Navbar fxEnabled={fx} fxLocked={reducedMotion} onToggleFx={toggleFx} />

      {/*
        Sections opt out of pointer events at the wrapper level and
        re-enable them on content panels.
      */}
      <main className="relative z-10"><Outlet /></main>

      <Footer />

      <StatusBar />

      <Toaster theme="dark" position="bottom-right" offset={STATUS_BAR_PX + 16} />

      <BootSequence />
    </div>
  );
}
