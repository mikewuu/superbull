import { describe, expect, it } from 'vitest';
import { getUptimeBarColor } from '../src/lib/status-pages/get-uptime-bar-color';

describe('getUptimeBarColor', () => {
  it('returns gray for null', () => {
    expect(getUptimeBarColor(null)).toBe('gray');
  });

  it('returns green for a rate well above the green threshold', () => {
    expect(getUptimeBarColor(0.995)).toBe('green');
  });

  it('returns green at the exact green boundary of 0.99', () => {
    expect(getUptimeBarColor(0.99)).toBe('green');
  });

  it('returns amber just under the green boundary', () => {
    expect(getUptimeBarColor(0.989)).toBe('amber');
  });

  it('returns amber for a rate well within the amber range', () => {
    expect(getUptimeBarColor(0.97)).toBe('amber');
  });

  it('returns amber at the exact amber boundary of 0.95', () => {
    expect(getUptimeBarColor(0.95)).toBe('amber');
  });

  it('returns red just under the amber boundary', () => {
    expect(getUptimeBarColor(0.949)).toBe('red');
  });

  it('returns red for a low rate', () => {
    expect(getUptimeBarColor(0.5)).toBe('red');
  });
});
