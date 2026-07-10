import { describe, expect, it } from 'vitest';
import { formatComputeTime } from '../src/lib/analytics/format-compute-time';

describe('formatComputeTime', () => {
  it('formats sub-minute durations as seconds', () => {
    expect(formatComputeTime(42)).toBe('42s');
  });

  it('formats zero seconds', () => {
    expect(formatComputeTime(0)).toBe('0s');
  });

  it('formats minute-scale durations as minutes and seconds', () => {
    expect(formatComputeTime(125)).toBe('2m 5s');
  });

  it('formats hour-scale durations as hours and minutes', () => {
    expect(formatComputeTime(2 * 3600 + 14 * 60)).toBe('2h 14m');
  });

  it('rounds fractional seconds', () => {
    expect(formatComputeTime(59.6)).toBe('1m 0s');
  });
});
