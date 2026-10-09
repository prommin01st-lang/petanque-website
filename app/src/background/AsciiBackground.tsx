import { useEffect, useRef, useState } from 'react';
import {
  PARALLAX, RAMP, SCRAMBLE, easeToward, layerCells, liteMode, nearDrift, parallaxOffset, pointerOffset,
} from './asciiMath';
import { createGovernor, updateGovernor } from './qualityGovernor';
import { createProgram, fullscreenQuad } from './gl';
import type { GL } from './gl';
import { createGlyphAtlas } from './glyphAtlas';
import { FRAG_ASCII, VERT } from './shader';
import { createTrail } from './trail';
import { manageGLLifecycle } from './glLifecycle';
import { pointerActive, usePointerField } from './usePointerField';
import StaticAsciiBackdrop from './StaticAsciiBackdrop';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_DPR = 1.5;
const FRAME_MS = 1000 / 60;
const SCRAMBLE_RADIUS_CSS = 120;
const FONT_TIMEOUT_MS = 1500;

/** Overall field strength over the background (keeps body text readable). */
const FIELD_INTENSITY = 0.85;
/** Parallax easing rates (1/s). */
const MOUSE_EASE = 3;
const SCROLL_EASE = 6;
const COARSE_POINTER = '(pointer: coarse)';

/* ------------------------------------------------------------------ */
/*  Dev-only deterministic frame:                                      */
/*  ?asciiT=<ms>[&asciiMouse=<x>,<y>][&asciiScroll=<px>]               */
/* ------------------------------------------------------------------ */

interface DebugFrame {
  timeMs: number;
  mouse: [number, number] | null;
  scroll: number;
}

function readDebugFrame(): DebugFrame | null {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(window.location.search);
  const t = params.get('asciiT');
  if (t === null || !Number.isFinite(Number(t))) return null;
  const m = params.get('asciiMouse')?.split(',').map(Number);
  const mouse = m && m.length === 2 && m.every(Number.isFinite) ? ([m[0], m[1]] as [number, number]) : null;
  const scroll = Number(params.get('asciiScroll') ?? 0);
  return { timeMs: Number(t), mouse, scroll: Number.isFinite(scroll) ? scroll : 0 };
}

function fontsReady(): Promise<unknown> {
  const fonts = document.fonts;
  if (!fonts?.load) return Promise.resolve();
  return Promise.race([
    fonts.load('16px "JetBrains Mono"').catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
  ]);
}

/* ------------------------------------------------------------------ */
/*  AsciiBackground — fixed full-viewport WebGL ASCII field            */
/* ------------------------------------------------------------------ */

export default function AsciiBackground({ cell = 8 }: { cell?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = usePointerField();
  const [failed, setFailed] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let life: { dispose(): void } | null = null;

    const start = async () => {
      await fontsReady();
      if (disposed) return;
      const debug = readDebugFrame();
      const attrs: WebGLContextAttributes = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: debug !== null,
      };
      let gl: GL | null = null;
      try {
        gl = (canvas.getContext('webgl2', attrs) as WebGL2RenderingContext | null)
          ?? (canvas.getContext('webgl', attrs) as WebGLRenderingContext | null);
      } catch {
        gl = null;
      }
      if (!gl) {
        setFailed(true);
        return;
      }
      const ctx = gl;
      life = manageGLLifecycle(canvas, () => run(ctx, canvas, debug), {
        onLost: () => setLost(true),
        onRestored: () => setLost(false),
        onFail: (err) => {
          if (import.meta.env.DEV) console.warn('[ascii-bg] init failed', err);
          setFailed(true);
        },
      });
    };

    /**
     * Builds every GL resource and starts the loop/listeners. Returns a
     * teardown that stops everything; if setup throws part-way, whatever was
     * already created is released before rethrowing.
     */
    const run = (gl: GL, canvas: HTMLCanvasElement, debug: DebugFrame | null) => {
      const cleanups: (() => void)[] = [];
      let alive = true;
      const teardown = () => {
        alive = false;
        // Deleting on a lost context is a no-op, so this is safe either way.
        for (const fn of cleanups.splice(0).reverse()) fn();
      };

      try {
        const program = createProgram(gl, VERT, FRAG_ASCII);
        cleanups.push(() => gl.deleteProgram(program));
        const quad = fullscreenQuad(gl);
        cleanups.push(() => quad.dispose());
        const trail = createTrail(gl);
        cleanups.push(() => trail.dispose());

        const names = [
          'uRampFar', 'uRampMid', 'uScrambleMid', 'uGlyphNear', 'uTrail', 'uRampCount', 'uScrambleCount',
          'uCellFar', 'uCellMid', 'uCellNear', 'uOffFar', 'uOffMid', 'uOffNear', 'uTime',
          'uScrambleRadius', 'uResolution', 'uMouse', 'uLite', 'uIntensity', 'uScan', 'uNearDrift',
        ] as const;
        const u = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)])) as Record<
          (typeof names)[number],
          WebGLUniformLocation | null
        >;

        // Glyph atlases, one per layer cell size (device px, NEAREST 1:1).
        // The near atlas only exists while the near layer is drawn (not lite).
        type Atlas = { texture: WebGLTexture; count: number };
        let atlases: { farRamp: Atlas; midRamp: Atlas; midScramble: Atlas } | null = null;
        let nearAtlas: Atlas | null = null;
        const freeNear = () => {
          if (nearAtlas) gl.deleteTexture(nearAtlas.texture);
          nearAtlas = null;
        };
        const freeAtlases = () => {
          if (atlases) {
            gl.deleteTexture(atlases.farRamp.texture);
            gl.deleteTexture(atlases.midRamp.texture);
            gl.deleteTexture(atlases.midScramble.texture);
          }
          atlases = null;
          freeNear();
        };
        cleanups.push(freeAtlases);
        type Px = [number, number];
        let cells: { far: Px; mid: Px; near: Px } = { far: [0, 0], mid: [0, 0], near: [0, 0] };
        let width = 1;
        let height = 1;
        let scale = 1;
        let lite = false;
        let scan = 1;
        // Frame-time governor: 2 = full, 1 = lite, 0 = lite at DPR 1.
        const governor = createGovernor();

        const resize = () => {
          const deviceDpr = window.devicePixelRatio || 1;
          const dpr = governor.level === 0 ? 1 : Math.min(deviceDpr, MAX_DPR);
          const cssW = canvas.clientWidth || window.innerWidth;
          const cssH = canvas.clientHeight || window.innerHeight;
          width = Math.max(1, Math.round(cssW * dpr));
          height = Math.max(1, Math.round(cssH * dpr));
          scale = width / cssW;
          if (canvas.width !== width) canvas.width = width;
          if (canvas.height !== height) canvas.height = height;
          const coarse = typeof window.matchMedia === 'function' && window.matchMedia(COARSE_POINTER).matches;
          lite = liteMode(cssW, coarse) || governor.level < 2;
          // Scanlines are 2 canvas px; only crisp when canvas px == device px.
          scan = Math.abs(scale - deviceDpr) < 0.01 ? 1 : 0;
          const css = layerCells(cell);
          const dev = (c: Px): Px => [Math.max(1, Math.round(c[0] * dpr)), Math.max(1, Math.round(c[1] * dpr))];
          const next = { far: dev(css.far), mid: dev(css.mid), near: dev(css.near) };
          if (!atlases || String([next.far, next.mid, next.near]) !== String([cells.far, cells.mid, cells.near])) {
            freeAtlases();
            atlases = {
              farRamp: createGlyphAtlas(gl, RAMP, ...next.far),
              midRamp: createGlyphAtlas(gl, RAMP, ...next.mid),
              midScramble: createGlyphAtlas(gl, SCRAMBLE, ...next.mid),
            };
            cells = next;
          }
          if (lite) freeNear();
          else if (!nearAtlas) nearAtlas = createGlyphAtlas(gl, SCRAMBLE, ...cells.near);
        };
        resize();

        /** Binds a texture to a unit and points a sampler at it. */
        const bindTex = (unit: number, loc: WebGLUniformLocation | null, tex: WebGLTexture) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniform1i(loc, unit);
        };
        const offScratch = new Float32Array(2);
        const setOffset = (loc: WebGLUniformLocation | null, mouse: ArrayLike<number>, scroll: number, factor: number) => {
          parallaxOffset(mouse, scroll, factor, offScratch);
          gl.uniform2f(loc, offScratch[0] * scale, offScratch[1] * scale);
        };

        /**
         * One frame. `hasMouse`/`mx`/`my` (CSS px) drive the scramble;
         * `pmouse` is the eased pointer offset (-1..1 from the centre) and
         * `scroll` the eased window.scrollY (CSS px), both for parallax.
         */
        const draw = (timeMs: number, hasMouse: boolean, mx: number, my: number, pmouse: ArrayLike<number>, scroll: number) => {
          if (!alive || !atlases) return;
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          gl.viewport(0, 0, width, height);
          gl.useProgram(program);
          bindTex(0, u.uRampFar, atlases.farRamp.texture);
          bindTex(1, u.uRampMid, atlases.midRamp.texture);
          bindTex(2, u.uScrambleMid, atlases.midScramble.texture);
          // In lite mode the near branch never samples; bind a valid stand-in.
          bindTex(3, u.uGlyphNear, (nearAtlas ?? atlases.midScramble).texture);
          bindTex(4, u.uTrail, trail.texture());
          gl.uniform1f(u.uRampCount, atlases.midRamp.count);
          gl.uniform1f(u.uScrambleCount, atlases.midScramble.count);
          gl.uniform2f(u.uCellFar, cells.far[0], cells.far[1]);
          gl.uniform2f(u.uCellMid, cells.mid[0], cells.mid[1]);
          gl.uniform2f(u.uCellNear, cells.near[0], cells.near[1]);
          setOffset(u.uOffFar, pmouse, scroll, PARALLAX.far);
          setOffset(u.uOffMid, pmouse, scroll, PARALLAX.mid);
          setOffset(u.uOffNear, pmouse, scroll, PARALLAX.near);
          gl.uniform1f(u.uLite, lite ? 1 : 0);
          gl.uniform1f(u.uIntensity, FIELD_INTENSITY);
          gl.uniform1f(u.uScan, scan);
          gl.uniform1f(u.uNearDrift, nearDrift(timeMs / 1000));
          gl.uniform1f(u.uTime, timeMs / 1000);
          gl.uniform1f(u.uScrambleRadius, SCRAMBLE_RADIUS_CSS * scale);
          gl.uniform2f(u.uResolution, width, height);
          if (hasMouse) gl.uniform2f(u.uMouse, mx * scale, height - my * scale);
          else gl.uniform2f(u.uMouse, -1e4, -1e4);
          quad.draw();
        };

        let raf = 0;
        let last = 0;
        let nextAt = 0;
        let elapsed = 0;
        // Per-frame scratch (no allocations in the loop): trail UVs swap
        // between two tuples; parallax state is eased in place.
        let uv: [number, number] = [0, 0];
        let prevUV: [number, number] = [0, 0];
        let hasPrev = false;
        const pTarget = new Float32Array(2);
        const pMouse = new Float32Array(2);
        let pScroll = window.scrollY;

        const loop = (now: number) => {
          if (!alive) return;
          raf = requestAnimationFrame(loop);
          // Cap at ~60 fps on high-refresh displays: draw on the first rAF at or
          // after each 1/60 s deadline (1 ms tolerance for timer jitter).
          if (now < nextAt - 1) return;
          nextAt = now - nextAt > FRAME_MS ? now + FRAME_MS : nextAt + FRAME_MS;
          // Step quality down/up on sustained frame-interval trends.
          if (last && updateGovernor(governor, now - last)) resize();
          const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
          last = now;
          elapsed += dt * 1000;
          const p = pointer.current;
          const aspect = width / height;
          const hasMouse = pointerActive(p, performance.now());
          if (hasMouse) {
            uv[0] = (p.x * scale) / width;
            uv[1] = 1 - (p.y * scale) / height;
            const moved = !hasPrev || uv[0] !== prevUV[0] || uv[1] !== prevUV[1];
            trail.update(moved ? uv : null, hasPrev ? prevUV : null, dt, aspect);
            const t = prevUV;
            prevUV = uv;
            uv = t;
            hasPrev = true;
          } else {
            trail.update(null, null, dt, aspect);
            hasPrev = false;
          }
          // Parallax follows the last pointer position while it is over the
          // window (even when idle) and recentres once it leaves.
          if (p.active) pointerOffset(p.x, p.y, width / scale, height / scale, pTarget);
          else pTarget[0] = pTarget[1] = 0;
          pMouse[0] = easeToward(pMouse[0], pTarget[0], dt, MOUSE_EASE);
          pMouse[1] = easeToward(pMouse[1], pTarget[1], dt, MOUSE_EASE);
          pScroll = easeToward(pScroll, window.scrollY, dt, SCROLL_EASE);
          draw(elapsed, hasMouse, p.x, p.y, pMouse, pScroll);
        };

        const startLoop = () => {
          if (!alive || raf || document.hidden) return;
          last = 0;
          nextAt = 0;
          raf = requestAnimationFrame(loop);
        };
        const stopLoop = () => {
          cancelAnimationFrame(raf);
          raf = 0;
        };
        cleanups.push(stopLoop);

        const drawDebug = (d: DebugFrame) => {
          const m = d.mouse;
          const pm = m ? pointerOffset(m[0], m[1], width / scale, height / scale) : [0, 0];
          draw(d.timeMs, m !== null, m?.[0] ?? 0, m?.[1] ?? 0, pm, d.scroll);
        };
        const onResize = () => {
          if (!alive) return;
          resize();
          if (debug) drawDebug(debug);
        };
        const ro = new ResizeObserver(onResize);
        ro.observe(canvas);
        cleanups.push(() => ro.disconnect());

        // DPR-only changes (zoom, moving between monitors) don't resize the
        // canvas box, so watch the current resolution and re-arm on change.
        let dprQuery: MediaQueryList | null = null;
        const onDprChange = () => {
          dprQuery?.removeEventListener('change', onDprChange);
          watchDpr();
          onResize();
        };
        const watchDpr = () => {
          if (!alive || typeof window.matchMedia !== 'function') return;
          dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
          dprQuery.addEventListener('change', onDprChange);
        };
        watchDpr();
        cleanups.push(() => dprQuery?.removeEventListener('change', onDprChange));

        if (debug) {
          drawDebug(debug);
          canvas.dataset.asciiReady = '1';
        } else {
          const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
          document.addEventListener('visibilitychange', onVisibility);
          cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
          startLoop();
        }
      } catch (err) {
        teardown();
        throw err;
      }
      return teardown;
    };

    void start();
    return () => {
      disposed = true;
      life?.dispose();
    };
  }, [cell, pointer]);

  if (failed) return <StaticAsciiBackdrop />;

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none">
        <canvas ref={canvasRef} data-testid="ascii-background" className="block w-full h-full pointer-events-none" />
      </div>
      {/* While the context is lost (until the browser restores it) show the static field on top. */}
      {lost && <StaticAsciiBackdrop />}
    </>
  );
}
