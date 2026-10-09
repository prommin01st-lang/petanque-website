import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { BOURKE_RAMP, buildCells, cellsInRadius, colsForWidth, gridSize, hashRand } from './asciiImage';
import type { AsciiCell } from './asciiImage';

interface AsciiImageProps {
  src: string;
  /** Accessible description; pass '' for a purely decorative image. */
  alt: string;
  /** Maximum columns. The effective count targets cells ≥ 4.5 CSS px for the rendered width. */
  cols?: number;
  /** false → static decoration: no toggle, lens, ripple or click. */
  interactive?: boolean;
  className?: string;
}

const RIPPLE_MS = 400;
const DISSOLVE_MS = 300;
/** Lens and ripple radii share one geometry: CSS pixels around the raw pointer. */
const LENS_R_PX = 36;
const RIPPLE_R_PX = 44;
const MIN_CELL_PX = 4.5;
const FONT_STACK = '"JetBrains Mono", ui-monospace, monospace';
const BG = '#0C0C0C';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/* ------------------------------------------------------------------ */
/*  Render engine — plain object + module functions, mutated only from */
/*  effects, observers, RAF callbacks and event handlers.              */
/* ------------------------------------------------------------------ */

interface Engine {
  canvas: HTMLCanvasElement | null;
  frame: HTMLDivElement | null;
  img: HTMLImageElement | null;
  cells: AsciiCell[];
  cols: number;
  rows: number;
  maxCols: number;
  /** Glyph advance / font size for the bold mono face. */
  advance: number;
  /** Raw pointer position, CSS px relative to the canvas. */
  hover: { x: number; y: number } | null;
  ripple: { x: number; y: number; start: number } | null;
  /** Fraction of cells showing photo pixels (0 = ASCII, 1 = photo). */
  frac: number;
  target: number;
  last: number;
  reduced: boolean;
  raf: number | null;
  alive: boolean;
  onGrid: (cols: number, rows: number) => void;
  onError: () => void;
}

function createEngine(): Engine {
  return {
    canvas: null,
    frame: null,
    img: null,
    cells: [],
    cols: 0,
    rows: 0,
    maxCols: 88,
    advance: 0.6,
    hover: null,
    ripple: null,
    frac: 0,
    target: 0,
    last: 0,
    reduced: false,
    raf: null,
    alive: true,
    onGrid: () => {},
    onError: () => {},
  };
}

function requestPaint(e: Engine): void {
  if (!e.alive || e.raf != null) return;
  e.raf = requestAnimationFrame((now) => {
    e.raf = null;
    paint(e, now);
  });
}

function cancelPaint(e: Engine): void {
  if (e.raf != null) cancelAnimationFrame(e.raf);
  e.raf = null;
}

/** Move the dissolve fraction toward its target (instant under reduced motion). */
function advance(e: Engine, now: number): void {
  if (e.reduced) {
    e.frac = e.target;
  } else {
    const step = Math.max(0, now - e.last) / DISSOLVE_MS;
    e.frac = e.frac < e.target ? Math.min(e.target, e.frac + step) : Math.max(e.target, e.frac - step);
  }
  e.last = now;
}

function measureFont(e: Engine): void {
  const ctx = e.canvas?.getContext('2d');
  if (!ctx) return;
  ctx.font = `700 100px ${FONT_STACK}`;
  const w = ctx.measureText('M').width;
  if (w > 0) e.advance = w / 100;
}

/** (Re)sample the image when the effective grid changes, then repaint. */
function rebuild(e: Engine): void {
  const img = e.img;
  if (!e.alive || !img) return;
  const width = e.frame?.clientWidth ?? 0;
  const { cols, rows } = gridSize(img.naturalWidth, img.naturalHeight, colsForWidth(width, e.maxCols, MIN_CELL_PX));
  if (cols !== e.cols || rows !== e.rows || e.cells.length === 0) {
    try {
      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) throw new Error('2d context unavailable');
      octx.drawImage(img, 0, 0, cols, rows);
      e.cells = buildCells(octx.getImageData(0, 0, cols, rows).data, cols, rows);
    } catch {
      e.cells = [];
      e.onError();
      return;
    }
    e.cols = cols;
    e.rows = rows;
    e.onGrid(cols, rows);
  }
  requestPaint(e);
}

function paint(e: Engine, now: number): void {
  const { canvas, img, cells, cols, rows } = e;
  if (!canvas || !img || cells.length === 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (!(cssW > 0 && cssH > 0)) return;

  // Backing store in device pixels (re-evaluated every frame, so DPR changes apply).
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (canvas.width !== pxW) canvas.width = pxW;
  if (canvas.height !== pxH) canvas.height = pxH;

  advance(e, now);
  const frac = e.frac;
  let rippleOn = false;

  if (frac >= 1) {
    // Settled on the photo: draw it once as a whole image (no cell seams).
    ctx.drawImage(img, 0, 0, pxW, pxH);
  } else {
    const cellW = pxW / cols;
    const cellH = pxH / rows;
    const fontPx = cellW / e.advance; // glyph advance fills the cell width
    const yPad = (cellH - fontPx) / 2;
    const sw = img.naturalWidth / cols;
    const sh = img.naturalHeight / rows;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, pxW, pxH);
    ctx.font = `700 ${fontPx}px ${FONT_STACK}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const ripple = e.ripple;
    let scrambled: Set<number> | null = null;
    if (!e.reduced && ripple && now - ripple.start < RIPPLE_MS) {
      rippleOn = true;
      const cw = cssW / cols;
      const ch = cssH / rows;
      scrambled = new Set(
        cellsInRadius(ripple.x / cw - 0.5, ripple.y / ch - 0.5, RIPPLE_R_PX / cw, cols, rows, ch / cw).map(
          (c) => c.y * cols + c.x,
        ),
      );
    }
    const tick = Math.floor(now / 60);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (frac > 0 && hashRand(i + 1) < frac) {
          // Mid-dissolve photo cell — integer rects so neighbours meet without seams.
          const dx = Math.round(x * cellW);
          const dy = Math.round(y * cellH);
          ctx.drawImage(img, x * sw, y * sh, sw, sh, dx, dy, Math.round((x + 1) * cellW) - dx, Math.round((y + 1) * cellH) - dy);
          continue;
        }
        const cell = cells[i];
        const glyph = scrambled?.has(i)
          ? BOURKE_RAMP[Math.floor(hashRand(i * 31 + tick) * (BOURKE_RAMP.length - 1))]
          : cell.glyph;
        if (glyph === ' ') continue;
        ctx.fillStyle = cell.color;
        ctx.fillText(glyph, x * cellW, y * cellH + yPad);
      }
    }

    // Reveal lens: real pixels through a circle at the raw pointer (static under reduced motion too).
    if (frac === 0 && e.hover) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(e.hover.x * dpr, e.hover.y * dpr, LENS_R_PX * dpr, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, pxW, pxH);
      ctx.restore();
    }
  }

  // Animate only while a dissolve or ripple is in flight — idle means no RAF.
  if (e.frac !== e.target || rippleOn) requestPaint(e);
}

function canvasSupported(): boolean {
  try {
    return document.createElement('canvas').getContext('2d') != null;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  AsciiImage — terminal-coloured ASCII image with hover lens,        */
/*  scramble ripple, and click / button toggle to the full photo.      */
/* ------------------------------------------------------------------ */

export default function AsciiImage({ src, alt, cols = 88, interactive = true, className = '' }: AsciiImageProps) {
  const { t } = useI18n();
  const [supported] = useState(canvasSupported);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [grid, setGrid] = useState<{ cols: number; rows: number } | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);

  const canvasMode = supported && failedSrc !== src;

  /* --- engine lifecycle: reduced motion, resize, fonts --- */
  useEffect(() => {
    if (!canvasMode) return;
    const e = createEngine();
    e.canvas = canvasRef.current;
    e.frame = frameRef.current;
    e.onGrid = (c, r) => setGrid({ cols: c, rows: r });
    engineRef.current = e;

    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null;
    e.reduced = mq?.matches ?? false;
    const onMotion = () => {
      e.reduced = mq?.matches ?? false;
      e.ripple = null;
      requestPaint(e);
    };
    mq?.addEventListener?.('change', onMotion);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && e.frame) {
      ro = new ResizeObserver(() => rebuild(e));
      ro.observe(e.frame);
    }

    const onFonts = () => {
      if (!e.alive) return;
      measureFont(e);
      requestPaint(e);
    };
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (fonts && typeof fonts.load === 'function') {
      fonts.load(`700 12px "JetBrains Mono"`).then(onFonts, onFonts);
    } else {
      onFonts();
    }

    return () => {
      e.alive = false;
      cancelPaint(e);
      ro?.disconnect();
      mq?.removeEventListener?.('change', onMotion);
      if (engineRef.current === e) engineRef.current = null;
    };
  }, [canvasMode]);

  /* --- image loading --- */
  useEffect(() => {
    const e = engineRef.current;
    if (!canvasMode || !e) return;
    let cancelled = false;
    e.maxCols = cols;
    e.img = null;
    e.cells = [];
    e.cols = 0;
    e.rows = 0;
    const fail = () => {
      if (!cancelled) setFailedSrc(src);
    };
    e.onError = fail;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (cancelled) return;
      e.img = img;
      rebuild(e);
    };
    img.onerror = fail;
    img.src = src;
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, cols, canvasMode]);

  /* --- interaction --- */
  const toggle = () => {
    const next = !showPhoto;
    setShowPhoto(next);
    const e = engineRef.current;
    if (!e) return;
    advance(e, performance.now()); // carry the current progress if mid-dissolve
    e.target = next ? 1 : 0;
    if (e.reduced) e.frac = e.target;
    e.hover = null;
    e.ripple = null;
    requestPaint(e);
  };

  const pointerPos = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };

  const onPointerMove = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const e = engineRef.current;
    if (!e || showPhoto) return;
    const p = pointerPos(ev);
    e.hover = p;
    e.ripple = { ...p, start: performance.now() };
    requestPaint(e);
  };

  const clearHover = () => {
    const e = engineRef.current;
    if (!e) return;
    e.hover = null;
    e.ripple = null;
    requestPaint(e);
  };

  const onPointerEnd = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    // Touch/pen have no "leave" after a tap — drop the lens so it doesn't stick.
    if (ev.pointerType !== 'mouse') clearHover();
  };

  if (!canvasMode) {
    return <img src={src} alt={alt} className={`ascii-image-fallback ${className}`} />;
  }

  const decorative = alt === '';
  return (
    <div className={`ascii-image ${className}`}>
      <div
        ref={frameRef}
        className="ascii-image-frame"
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : alt}
        aria-hidden={decorative || undefined}
        style={{ aspectRatio: grid ? `${grid.cols} / ${grid.rows * 2}` : '1 / 1' }}
        data-cols={grid?.cols}
        data-rows={grid?.rows}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={interactive ? 'is-interactive' : undefined}
          {...(interactive && {
            onClick: toggle,
            onPointerMove,
            onPointerLeave: clearHover,
            onPointerUp: onPointerEnd,
            onPointerCancel: onPointerEnd,
          })}
        />
      </div>
      {interactive && (
        <button type="button" className="ascii-image-toggle" aria-pressed={showPhoto} onClick={toggle}>
          <span aria-hidden="true">[</span>
          {t.common.asciiPhotoToggle}
          <span aria-hidden="true">]</span>
        </button>
      )}
    </div>
  );
}
