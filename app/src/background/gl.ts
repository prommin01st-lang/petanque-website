/* ------------------------------------------------------------------ */
/*  Minimal WebGL helpers (WebGL1 + WebGL2)                            */
/* ------------------------------------------------------------------ */

export type GL = WebGLRenderingContext | WebGL2RenderingContext;

export const isWebGL2 = (gl: GL): gl is WebGL2RenderingContext =>
  typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

function compile(gl: GL, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log}`);
  }
  return shader;
}

export function createProgram(gl: GL, vs: string, fs: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  let v: WebGLShader;
  let f: WebGLShader;
  try {
    v = compile(gl, gl.VERTEX_SHADER, vs);
  } catch (err) {
    gl.deleteProgram(program);
    throw err;
  }
  try {
    f = compile(gl, gl.FRAGMENT_SHADER, fs);
  } catch (err) {
    gl.deleteShader(v);
    gl.deleteProgram(program);
    throw err;
  }
  gl.attachShader(program, v);
  gl.attachShader(program, f);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`program link failed: ${log}`);
  }
  return program;
}

/** One VBO holding two clip-space triangles; binds it to attribute 0. */
export function fullscreenQuad(gl: GL): { draw(): void; dispose(): void } {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  return {
    draw() {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      gl.deleteBuffer(buffer);
    },
  };
}

export interface RenderTarget {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
  dispose(): void;
}

type TexFormat = { internal: number; format: number; type: number; filter: number };

function tryTarget(gl: GL, w: number, h: number, fmt: TexFormat): RenderTarget | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    gl.deleteTexture(texture);
    return null;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, fmt.filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, fmt.filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, fmt.format, fmt.type, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  if (ok) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!ok) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    return null;
  }
  return {
    texture,
    framebuffer,
    width: w,
    height: h,
    dispose() {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
    },
  };
}

/**
 * Colour render target: RGBA half-float when renderable (WebGL2 +
 * EXT_color_buffer_float/half_float, or WebGL1 + OES_texture_half_float +
 * EXT_color_buffer_half_float), otherwise RGBA8.
 */
export function createTarget(gl: GL, w: number, h: number): RenderTarget {
  const candidates: TexFormat[] = [];
  if (isWebGL2(gl)) {
    if (gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')) {
      candidates.push({ internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR });
    }
  } else {
    const half = gl.getExtension('OES_texture_half_float');
    if (half && gl.getExtension('EXT_color_buffer_half_float')) {
      const linear = gl.getExtension('OES_texture_half_float_linear');
      candidates.push({
        internal: gl.RGBA,
        format: gl.RGBA,
        type: half.HALF_FLOAT_OES,
        filter: linear ? gl.LINEAR : gl.NEAREST,
      });
    }
  }
  candidates.push({ internal: gl.RGBA, format: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR });
  for (const fmt of candidates) {
    const target = tryTarget(gl, w, h, fmt);
    if (target) return target;
  }
  throw new Error('no renderable target format');
}
