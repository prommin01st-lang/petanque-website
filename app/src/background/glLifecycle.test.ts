import { describe, expect, it, vi } from 'vitest';
import { manageGLLifecycle } from './glLifecycle';

const lost = () => new Event('webglcontextlost', { cancelable: true });
const restored = () => new Event('webglcontextrestored');

describe('manageGLLifecycle', () => {
  it('initialises immediately', () => {
    const canvas = document.createElement('canvas');
    const init = vi.fn(() => () => {});
    manageGLLifecycle(canvas, init);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('on context loss: prevents default, tears down and reports', () => {
    const canvas = document.createElement('canvas');
    const teardown = vi.fn();
    const onLost = vi.fn();
    const life = manageGLLifecycle(canvas, () => teardown, { onLost });
    const e = lost();
    canvas.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(teardown).toHaveBeenCalledTimes(1);
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(life.isLost()).toBe(true);
    // a second loss event does not tear down twice
    canvas.dispatchEvent(lost());
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('re-initialises on restore', () => {
    const canvas = document.createElement('canvas');
    const init = vi.fn(() => () => {});
    const onRestored = vi.fn();
    const life = manageGLLifecycle(canvas, init, { onRestored });
    canvas.dispatchEvent(lost());
    canvas.dispatchEvent(restored());
    expect(init).toHaveBeenCalledTimes(2);
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(life.isLost()).toBe(false);
  });

  it('ignores restore without a prior loss', () => {
    const canvas = document.createElement('canvas');
    const init = vi.fn(() => () => {});
    manageGLLifecycle(canvas, init);
    canvas.dispatchEvent(restored());
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('reports init failures (initial and on restore)', () => {
    const canvas = document.createElement('canvas');
    const onFail = vi.fn();
    let calls = 0;
    manageGLLifecycle(
      canvas,
      () => {
        calls++;
        if (calls === 2) throw new Error('boom');
        return () => {};
      },
      { onFail },
    );
    expect(onFail).not.toHaveBeenCalled();
    canvas.dispatchEvent(lost());
    canvas.dispatchEvent(restored());
    expect(onFail).toHaveBeenCalledTimes(1);

    const onFail2 = vi.fn();
    manageGLLifecycle(document.createElement('canvas'), () => { throw new Error('x'); }, { onFail: onFail2 });
    expect(onFail2).toHaveBeenCalledTimes(1);
  });

  it('dispose tears down and detaches listeners', () => {
    const canvas = document.createElement('canvas');
    const teardown = vi.fn();
    const init = vi.fn(() => teardown);
    const life = manageGLLifecycle(canvas, init);
    life.dispose();
    expect(teardown).toHaveBeenCalledTimes(1);
    canvas.dispatchEvent(lost());
    canvas.dispatchEvent(restored());
    expect(init).toHaveBeenCalledTimes(1);
    expect(teardown).toHaveBeenCalledTimes(1);
  });
});
