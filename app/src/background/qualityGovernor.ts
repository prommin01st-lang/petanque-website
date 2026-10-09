/* ------------------------------------------------------------------ */
/*  Frame-time quality governor (pure, allocation-free)                */
/*                                                                     */
/*  Levels: 2 = full (all layers + bloom), 1 = lite (no near layer,    */
/*  no bloom), 0 = lite at DPR 1. Steps down after the smoothed frame  */
/*  interval stays above SLOW_MS for DOWN_AFTER_MS; steps up only      */
/*  after it stays below FAST_MS for `upAfterMs`. The gap between the  */
/*  thresholds plus a step-up backoff (doubles whenever a step-up is   */
/*  undone within PROBATION_MS) prevents oscillation.                  */
/*                                                                     */
/*  The loop is capped at 60 fps, so "headroom" means holding the cap  */
/*  (~16.7 ms) steadily — a vsync-capped interval can't go lower.      */
/* ------------------------------------------------------------------ */

export type QualityLevel = 0 | 1 | 2;

export const GOVERNOR = {
  MAX_LEVEL: 2 as QualityLevel,
  /** Smoothed interval above this (ms) counts as slow (< 50 fps). */
  SLOW_MS: 20,
  /** Smoothed interval below this (ms) counts as headroom (≈ holding 60 fps). */
  FAST_MS: 18,
  DOWN_AFTER_MS: 2000,
  UP_AFTER_MS: 10000,
  MAX_UP_AFTER_MS: 120000,
  /** A step-down this soon after a step-up counts as a failed attempt. */
  PROBATION_MS: 15000,
  /** Intervals longer than this are stalls/tab switches and are ignored. */
  MAX_FRAME_MS: 250,
  /** EMA weight of the newest interval. */
  ALPHA: 0.1,
  NOMINAL_MS: 1000 / 60,
} as const;

export interface Governor {
  level: QualityLevel;
  /** Smoothed frame interval (ms). */
  avg: number;
  slowFor: number;
  fastFor: number;
  upAfterMs: number;
  /** Running clock (ms of counted frames) and when the last step-up happened. */
  clock: number;
  lastUpAt: number;
}

export function createGovernor(level: QualityLevel = GOVERNOR.MAX_LEVEL): Governor {
  return {
    level,
    avg: GOVERNOR.NOMINAL_MS,
    slowFor: 0,
    fastFor: 0,
    upAfterMs: GOVERNOR.UP_AFTER_MS,
    clock: 0,
    lastUpAt: -Infinity,
  };
}

/** Feed one frame interval (ms). Mutates `g`; returns true when the level changed. */
export function updateGovernor(g: Governor, frameMs: number): boolean {
  if (!(frameMs > 0) || frameMs > GOVERNOR.MAX_FRAME_MS) return false;
  g.clock += frameMs;
  g.avg += (frameMs - g.avg) * GOVERNOR.ALPHA;

  if (g.avg > GOVERNOR.SLOW_MS) {
    g.fastFor = 0;
    g.slowFor += frameMs;
    if (g.slowFor >= GOVERNOR.DOWN_AFTER_MS && g.level > 0) {
      if (g.clock - g.lastUpAt < GOVERNOR.PROBATION_MS) {
        g.upAfterMs = Math.min(GOVERNOR.MAX_UP_AFTER_MS, g.upAfterMs * 2);
      }
      g.level = (g.level - 1) as QualityLevel;
      g.slowFor = 0;
      g.avg = GOVERNOR.NOMINAL_MS;
      return true;
    }
    return false;
  }
  g.slowFor = 0;
  if (g.avg < GOVERNOR.FAST_MS) {
    g.fastFor += frameMs;
    if (g.fastFor >= g.upAfterMs && g.level < GOVERNOR.MAX_LEVEL) {
      g.level = (g.level + 1) as QualityLevel;
      g.fastFor = 0;
      g.lastUpAt = g.clock;
      return true;
    }
  } else {
    g.fastFor = 0;
  }
  return false;
}
