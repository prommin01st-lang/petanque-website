import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import GridFloor from './scene/GridFloor';
import TechBlocks from './scene/TechBlocks';
import Particles from './scene/Particles';
import CoreObject from './scene/CoreObject';
import CameraRig from './scene/CameraRig';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface HoverInfo {
  name: string;
  x: number;
  y: number;
}

/* ------------------------------------------------------------------ */
/*  Environment checks                                                 */
/* ------------------------------------------------------------------ */

function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  SandboxCanvas — fixed full-viewport 3D backdrop                    */
/* ------------------------------------------------------------------ */

export default function SandboxCanvas() {
  // Detect once at mount (client-only SPA): honor reduced-motion + WebGL support
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !reduced && detectWebGL();
  });
  const [hidden, setHidden] = useState(false);
  const [isMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches),
  );

  /* Adaptive resolution: PerformanceMonitor lowers DPR when FPS drops */
  const maxDpr = isMobile ? 1.5 : 1.75;
  const [dpr, setDpr] = useState(maxDpr);

  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /*
   * Imperative tooltip update — a React state change per pointermove would
   * re-render on every frame of a hover; touching the DOM node directly
   * keeps hover tracking at zero React cost.
   */
  const handleTooltip = useCallback((info: HoverInfo | null) => {
    const el = tooltipRef.current;
    if (!el) return;
    if (!info) {
      el.style.opacity = '0';
      return;
    }
    if (el.textContent !== info.name) el.textContent = info.name;
    el.style.transform = `translate(${info.x + 14}px, ${info.y + 14}px)`;
    el.style.opacity = '1';
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div className="fixed inset-0 z-0" style={{ touchAction: 'pan-y' }} aria-hidden="true">
        <Canvas
          dpr={dpr}
          frameloop={hidden ? 'never' : 'always'}
          camera={{ position: [0, 2.2, 9], fov: 55, near: 0.1, far: 90 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <fog attach="fog" args={['#05080D', 14, 40]} />

          <ambientLight intensity={0.5} />
          <directionalLight position={[6, 10, 6]} intensity={1.1} />
          <pointLight position={[-8, 4, -2]} intensity={50} distance={28} decay={1.6} color="#00E5FF" />
          <pointLight position={[8, 3, -4]} intensity={40} distance={26} decay={1.6} color="#6C5CE7" />

          <PerformanceMonitor
            onChange={({ factor }) => {
              // factor: 0 (worst) → 1 (best). Scale DPR between 50% and 100%
              // of the device cap, quantized to avoid constant re-renders.
              const target = Math.min(maxDpr, Math.max(1, maxDpr * (0.5 + 0.5 * factor)));
              setDpr(Math.round(target * 4) / 4);
            }}
          >
            <Suspense fallback={null}>
              <GridFloor />
              <CoreObject />
              <TechBlocks mobile={isMobile} onTooltip={handleTooltip} />
              <Particles mobile={isMobile} />
            </Suspense>
            <CameraRig />
          </PerformanceMonitor>
        </Canvas>
      </div>

      {/* Hover tooltip — plain DOM so no webfont is needed inside WebGL */}
      <div
        ref={tooltipRef}
        className="fixed left-0 top-0 z-[70] pointer-events-none px-2 py-1 rounded-sm"
        style={{
          opacity: 0,
          willChange: 'transform',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          color: '#00E5FF',
          backgroundColor: 'rgba(5, 8, 13, 0.9)',
          border: '1px solid rgba(0, 229, 255, 0.35)',
          boxShadow: '0 0 12px rgba(0, 229, 255, 0.25)',
          whiteSpace: 'nowrap',
        }}
      />
    </>
  );
}
