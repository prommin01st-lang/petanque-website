import { CELL_ASPECT, RAMP, hash21, rampIndex, valueNoise } from './asciiMath';

/* ------------------------------------------------------------------ */
/*  Static ASCII field — shown when fx is off, motion is reduced, or  */
/*  WebGL is unavailable. Generated once at module load.               */
/* ------------------------------------------------------------------ */

// Enough for 2560×1440 at 12px/14px JetBrains Mono (7.2px advance): 356×103.
const COLS = 360;
const ROWS = 104;

const FIELD = (() => {
  const lines: string[] = [];
  for (let y = 0; y < ROWS; y++) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const n = valueNoise(x * 0.07, (y * 0.07) / CELL_ASPECT);
      const stream = hash21(x, 0) >= 0.985 ? ((y * 0.02 + hash21(x, 1)) % 1) : 0;
      line += RAMP[rampIndex(0.06 + 0.24 * n + 0.5 * stream * stream)];
    }
    lines.push(line);
  }
  return lines.join('\n');
})();

export default function StaticAsciiBackdrop() {
  return (
    <pre
      aria-hidden="true"
      data-testid="static-ascii-backdrop"
      className="fixed inset-0 z-0 m-0 overflow-hidden pointer-events-none select-none font-mono text-[12px] leading-[14px] text-hud-border"
    >
      {FIELD}
    </pre>
  );
}
