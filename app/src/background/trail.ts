import { createProgram, createTarget, fullscreenQuad } from './gl';
import type { GL, RenderTarget } from './gl';
import { FRAG_TRAIL, VERT } from './shader';

const RADIUS = 0.04;
const DECAY_PER_FRAME = 0.9202; // at 60 fps
// Per-frame floor subtraction (at 60 fps) so RGBA8 targets fade fully to 0.
const EPSILON_PER_FRAME = 0.002;

export interface Trail {
  texture(): WebGLTexture;
  update(mouseUV: [number, number] | null, prevUV: [number, number] | null, dt: number, aspect?: number): void;
  dispose(): void;
}

/** Ping-pong fading pointer trail in a `size × size` target (viewport UV). */
export function createTrail(gl: GL, size = 256): Trail {
  const program = createProgram(gl, VERT, FRAG_TRAIL);
  let quad: ReturnType<typeof fullscreenQuad> | null = null;
  let read: RenderTarget | null = null;
  let write: RenderTarget | null = null;
  try {
    quad = fullscreenQuad(gl);
    read = createTarget(gl, size, size);
    write = createTarget(gl, size, size);
  } catch (err) {
    read?.dispose();
    quad?.dispose();
    gl.deleteProgram(program);
    throw err;
  }
  return trailApi(gl, size, program, quad, read, write);
}

function trailApi(
  gl: GL,
  size: number,
  program: WebGLProgram,
  quad: ReturnType<typeof fullscreenQuad>,
  read: RenderTarget,
  write: RenderTarget,
): Trail {
  const loc = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    prev: loc('uPrev'),
    mouse: loc('uMouse'),
    mousePrev: loc('uMousePrev'),
    decay: loc('uDecay'),
    active: loc('uActive'),
    samples: loc('uSamples'),
    radius: loc('uRadius'),
    aspect: loc('uAspect'),
    epsilon: loc('uEpsilon'),
  };

  return {
    texture: () => read.texture,
    update(mouseUV, prevUV, dt, aspect = 1) {
      const from = prevUV ?? mouseUV;
      let samples = 1;
      if (mouseUV && from) {
        const dist = Math.hypot((mouseUV[0] - from[0]) * aspect, mouseUV[1] - from[1]);
        samples = Math.min(8, Math.max(1, Math.ceil(dist / (RADIUS * 0.5))));
      }
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, size, size);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(u.prev, 0);
      gl.uniform2f(u.mouse, mouseUV?.[0] ?? -10, mouseUV?.[1] ?? -10);
      gl.uniform2f(u.mousePrev, from?.[0] ?? -10, from?.[1] ?? -10);
      gl.uniform1f(u.decay, Math.pow(DECAY_PER_FRAME, Math.max(0, dt) * 60));
      gl.uniform1f(u.active, mouseUV ? 1 : 0);
      gl.uniform1f(u.samples, samples);
      gl.uniform1f(u.radius, RADIUS);
      gl.uniform1f(u.aspect, aspect);
      gl.uniform1f(u.epsilon, EPSILON_PER_FRAME * Math.max(0, dt) * 60);
      quad.draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const swap = read;
      read = write;
      write = swap;
    },
    dispose() {
      read.dispose();
      write.dispose();
      quad.dispose();
      gl.deleteProgram(program);
    },
  };
}
