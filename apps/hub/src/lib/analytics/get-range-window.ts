import type { AnalyticsRange } from './types';

export interface RangeWindow {
  fromTs: number;
  toTs: number;
  bucketMinutes: number;
}

const oneHourMs = 60 * 60_000;
const oneDayMs = 24 * oneHourMs;

export function getRangeWindow(range: AnalyticsRange, now: number): RangeWindow {
  if (range === '24h') {
    return { fromTs: now - oneDayMs, toTs: now, bucketMinutes: 60 };
  }
  if (range === '7d') {
    return { fromTs: now - 7 * oneDayMs, toTs: now, bucketMinutes: 4 * 60 };
  }
  return { fromTs: now - 30 * oneDayMs, toTs: now, bucketMinutes: 24 * 60 };
}
