import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/i18n/I18nContext';
import AsciiImage from './AsciiImage';

/* ---- test doubles -------------------------------------------------- */

/** Minimal 2D context: records draws, serves a gradient for getImageData. */
function makeCtx(opts: { taint?: boolean } = {}) {
  return {
    font: '',
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    clip: vi.fn(),
    measureText: vi.fn(() => ({ width: 60 })),
    getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
      if (opts.taint) throw new DOMException('tainted', 'SecurityError');
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        const v = Math.round((i / (w * h)) * 255);
        data.set([v, Math.round(v * 0.8), 40, 255], i * 4);
      }
      return { data };
    }),
  };
}

type Ctx = ReturnType<typeof makeCtx>;

function mockCanvas(ctx: Ctx | null) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (() => ctx) as unknown as HTMLCanvasElement['getContext'],
  );
}

/** Image that "loads" (960×960) on the next microtask, or errors for URLs containing "broken". */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = '';
  naturalWidth = 0;
  naturalHeight = 0;
  private current = '';
  get src() {
    return this.current;
  }
  set src(v: string) {
    this.current = v;
    queueMicrotask(() => {
      if (v.includes('broken')) {
        this.onerror?.();
      } else {
        this.naturalWidth = 960;
        this.naturalHeight = 960;
        this.onload?.();
      }
    });
  }
}

/** Manually flushed requestAnimationFrame queue. */
function mockRaf() {
  const pending = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    pending.set(++id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (h: number) => {
    pending.delete(h);
  });
  return {
    pending,
    flush(now = performance.now()) {
      const cbs = [...pending.values()];
      pending.clear();
      act(() => cbs.forEach((cb) => cb(now)));
    },
  };
}

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function renderImage(props: Partial<Parameters<typeof AsciiImage>[0]> = {}) {
  return render(
    <I18nProvider>
      <AsciiImage src="/profile.png" alt="Profile portrait" {...props} />
    </I18nProvider>,
  );
}

const frameOf = () => screen.getByRole('img', { name: 'Profile portrait' });
const canvasOf = () => document.querySelector('canvas') as HTMLCanvasElement;

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ---- no 2D context (jsdom default) ---------------------------------- */

describe('AsciiImage without a 2D context', () => {
  it('renders a plain <img> with the alt text and no toggle', () => {
    renderImage();
    const img = screen.getByRole('img', { name: 'Profile portrait' });
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', '/profile.png');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

/* ---- canvas path ----------------------------------------------------- */

describe('AsciiImage canvas path', () => {
  let ctx: Ctx;
  let raf: ReturnType<typeof mockRaf>;

  beforeEach(() => {
    ctx = makeCtx();
    mockCanvas(ctx);
    vi.stubGlobal('Image', FakeImage);
    raf = mockRaf();
  });

  it('builds the grid and keeps the toggle outside role=img', async () => {
    renderImage();
    const frame = frameOf();
    // jsdom has no layout (width 0) → falls back to the max column count; square image → rows = cols/2
    await waitFor(() => expect(frame).toHaveAttribute('data-cols', '88'));
    expect(frame).toHaveAttribute('data-rows', '44');
    expect(frame.style.aspectRatio).toBe('88 / 88');
    expect(ctx.getImageData).toHaveBeenCalledWith(0, 0, 88, 44);
    const button = screen.getByRole('button', { name: 'ASCII / photo' });
    expect(frame).not.toContainElement(button);
    expect(frame).toContainElement(canvasOf());
  });

  it('targets ≥ 4.5px cells for the rendered width and paints bold glyphs', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(360);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(360);
    renderImage();
    await waitFor(() => expect(frameOf()).toHaveAttribute('data-cols', '80'));
    raf.flush();
    expect(ctx.fillText).toHaveBeenCalled();
    expect(ctx.font).toMatch(/^700 /);
    // idle: nothing left scheduled after the frame
    expect(raf.pending.size).toBe(0);
  });

  it('toggles aria-pressed with a stable label', async () => {
    renderImage();
    const button = screen.getByRole('button', { name: 'ASCII / photo' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAccessibleName('ASCII / photo');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles when the canvas is clicked', async () => {
    renderImage();
    await waitFor(() => expect(frameOf()).toHaveAttribute('data-cols'));
    fireEvent.click(canvasOf());
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('dissolves over several frames, then settles on one whole-image draw', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(360);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(360);
    renderImage();
    await waitFor(() => expect(frameOf()).toHaveAttribute('data-cols'));
    raf.flush(1000);
    vi.spyOn(performance, 'now').mockReturnValue(1050);
    fireEvent.click(screen.getByRole('button'));
    raf.flush(1100); // mid-dissolve: more frames requested
    expect(raf.pending.size).toBe(1);
    ctx.drawImage.mockClear();
    raf.flush(2000); // finished
    expect(raf.pending.size).toBe(0);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage.mock.calls[0]).toHaveLength(5); // (img, 0, 0, w, h) — no per-cell seams
  });

  it('toggles instantly under reduced motion (single frame, no animation)', async () => {
    mockReducedMotion(true);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(360);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(360);
    renderImage();
    await waitFor(() => expect(frameOf()).toHaveAttribute('data-cols'));
    raf.flush();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    raf.flush();
    expect(raf.pending.size).toBe(0);
  });

  it('leaves no RAF pending after unmount', async () => {
    const { unmount } = renderImage();
    await waitFor(() => expect(frameOf()).toHaveAttribute('data-cols'));
    fireEvent.click(screen.getByRole('button'));
    expect(raf.pending.size).toBeGreaterThan(0);
    unmount();
    expect(raf.pending.size).toBe(0);
  });

  it('falls back to a plain <img> without a toggle when loading fails', async () => {
    renderImage({ src: '/uploads/broken.png' });
    await waitFor(() => expect(screen.getByRole('img', { name: 'Profile portrait' }).tagName).toBe('IMG'));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('falls back when pixel sampling throws (e.g. tainted canvas)', async () => {
    mockCanvas(makeCtx({ taint: true }));
    renderImage();
    await waitFor(() => expect(screen.getByRole('img', { name: 'Profile portrait' }).tagName).toBe('IMG'));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a decorative, non-interactive thumbnail without a toggle', async () => {
    renderImage({ alt: '', interactive: false });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(canvasOf()).not.toHaveClass('is-interactive');
  });
});
