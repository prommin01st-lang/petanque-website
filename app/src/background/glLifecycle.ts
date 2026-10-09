/* ------------------------------------------------------------------ */
/*  WebGL context lifecycle: init → (lost → teardown) → (restored →   */
/*  init again) → dispose.                                             */
/* ------------------------------------------------------------------ */

export interface GLLifecycleHooks {
  /** Context was lost; everything from `init` has been torn down. */
  onLost?(): void;
  /** Context was restored and `init` ran again successfully. */
  onRestored?(): void;
  /** `init` threw (initially or on restore). */
  onFail?(err: unknown): void;
}

export interface GLLifecycle {
  isLost(): boolean;
  dispose(): void;
}

/**
 * Runs `init` now and again after every `webglcontextrestored`. `init`
 * returns a teardown that must stop all loops/listeners it started; it is
 * called on context loss and on dispose. Loss events are `preventDefault`ed
 * so the browser will try to restore the context.
 */
export function manageGLLifecycle(
  canvas: HTMLCanvasElement,
  init: () => () => void,
  hooks: GLLifecycleHooks = {},
): GLLifecycle {
  let teardown: (() => void) | null = null;
  let lost = false;

  const runInit = (): boolean => {
    try {
      teardown = init();
      return true;
    } catch (err) {
      teardown = null;
      hooks.onFail?.(err);
      return false;
    }
  };

  const onLost = (e: Event) => {
    e.preventDefault();
    if (lost) return;
    lost = true;
    teardown?.();
    teardown = null;
    hooks.onLost?.();
  };

  const onRestored = () => {
    if (!lost) return;
    lost = false;
    if (runInit()) hooks.onRestored?.();
  };

  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  runInit();

  return {
    isLost: () => lost,
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      teardown?.();
      teardown = null;
    },
  };
}
