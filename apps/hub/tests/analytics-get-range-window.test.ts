import { describe, expect, it } from 'vitest';
import { getRangeWindow } from '../src/lib/analytics/get-range-window';

const now = Date.UTC(2026, 6, 10, 12, 0, 0);

describe('getRangeWindow', () => {
  it('returns a 24 hour window with 60 minute buckets', () => {
    const window = getRangeWindow('24h', now);

    expect(window).toEqual({ fromTs: now - 24 * 3_600_000, toTs: now, bucketMinutes: 60 });
  });

  it('returns a 7 day window with 4 hour buckets', () => {
    const window = getRangeWindow('7d', now);

    expect(window).toEqual({ fromTs: now - 7 * 24 * 3_600_000, toTs: now, bucketMinutes: 4 * 60 });
  });

  it('returns a 30 day window with 1 day buckets', () => {
    const window = getRangeWindow('30d', now);

    expect(window).toEqual({
      fromTs: now - 30 * 24 * 3_600_000,
      toTs: now,
      bucketMinutes: 24 * 60,
    });
  });

  it('always uses the given now as toTs', () => {
    const window = getRangeWindow('24h', 1000);

    expect(window.toTs).toBe(1000);
  });
});
