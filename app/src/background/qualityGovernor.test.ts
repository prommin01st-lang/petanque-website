import { describe, expect, it } from 'vitest';
import { GOVERNOR, createGovernor, updateGovernor } from './qualityGovernor';
import type { Governor } from './qualityGovernor';

/** Feed `seconds` of frames at a constant interval; returns the levels seen after each change. */
function run(g: Governor, frameMs: number, seconds: number): number[] {
  const changes: number[] = [];
  for (let t = 0; t < seconds * 1000; t += frameMs) if (updateGovernor(g, frameMs)) changes.push(g.level);
  return changes;
}

describe('qualityGovernor', () => {
  it('starts at full quality and stays there at 60 fps', () => {
    const g = createGovernor();
    expect(g.level).toBe(GOVERNOR.MAX_LEVEL);
    expect(run(g, 16.7, 30)).toEqual([]);
    expect(g.level).toBe(2);
  });

  it('steps down to lite, then to DPR 1, after ~2 s each of slow frames', () => {
    const g = createGovernor();
    expect(run(g, 30, 1.5)).toEqual([]); // not yet sustained
    expect(g.level).toBe(2);
    expect(run(g, 30, 1.5)).toEqual([1]);
    expect(run(g, 30, 2.5)).toEqual([0]);
    expect(run(g, 30, 10)).toEqual([]); // floor
    expect(g.level).toBe(0);
  });

  it('ignores a brief stall and huge gaps (tab switches)', () => {
    const g = createGovernor();
    run(g, 16.7, 1);
    run(g, 40, 0.3);
    run(g, 16.7, 2);
    expect(updateGovernor(g, 5000)).toBe(false);
    expect(run(g, 16.7, 2)).toEqual([]);
    expect(g.level).toBe(2);
  });

  it('steps back up only after sustained headroom', () => {
    const g = createGovernor(0);
    expect(run(g, 16.7, GOVERNOR.UP_AFTER_MS / 1000 - 1)).toEqual([]);
    expect(run(g, 16.7, 1.5)).toEqual([1]);
    expect(run(g, 16.7, GOVERNOR.UP_AFTER_MS / 1000 + 0.5)).toEqual([2]);
  });

  it('frames between the thresholds neither step down nor up (hysteresis band)', () => {
    const g = createGovernor(1);
    expect(run(g, 19, 60)).toEqual([]);
    expect(g.level).toBe(1);
  });

  it('backs off step-up after a failed attempt so it does not oscillate', () => {
    const g = createGovernor();
    run(g, 30, 3); // → 1
    expect(g.level).toBe(1);
    run(g, 16.7, GOVERNOR.UP_AFTER_MS / 1000 + 0.5); // → 2 (try again)
    expect(g.level).toBe(2);
    run(g, 30, 3); // fails again → 1, wait doubles
    expect(g.level).toBe(1);
    expect(run(g, 16.7, GOVERNOR.UP_AFTER_MS / 1000 + 0.5)).toEqual([]);
    expect(run(g, 16.7, GOVERNOR.UP_AFTER_MS / 1000 + 0.5)).toEqual([2]);
    // Over a long mixed run, changes stay rare.
    const flips = [...run(g, 30, 3), ...run(g, 16.7, 60), ...run(g, 30, 3), ...run(g, 16.7, 60)];
    expect(flips.length).toBeLessThanOrEqual(4);
  });
});
