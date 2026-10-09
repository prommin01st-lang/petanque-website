import { CELL_ASPECT } from './asciiMath';
import type { GL } from './gl';

/**
 * One-row glyph atlas: white glyphs on black, one `cellPx × cellH` cell per
 * character (cells keep the monospace aspect, taller than wide). Build it at
 * the on-screen device cell size so NEAREST sampling maps texels 1:1.
 */
export function createGlyphAtlas(
  gl: GL,
  chars: string,
  cellPx = 32,
  cellH = Math.round(cellPx / CELL_ASPECT),
): { texture: WebGLTexture; count: number } {
  const glyphs = Array.from(chars);
  const count = glyphs.length;
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * count;
  canvas.height = cellH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  // JetBrains Mono advance is 0.6em; keep the glyph inside the cell width.
  const size = Math.max(6, Math.min(cellH * 0.78, cellPx / 0.62));
  ctx.font = `${size}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  glyphs.forEach((ch, i) => ctx.fillText(ch, i * cellPx + cellPx / 2, cellH / 2 + size * 0.04));

  const texture = gl.createTexture();
  if (!texture) throw new Error('createTexture failed');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, count };
}
