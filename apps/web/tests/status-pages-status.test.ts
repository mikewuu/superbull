import { describe, expect, it } from 'vitest';
import { getOverallStatus } from '../src/lib/status-pages/get-overall-status';

describe('getOverallStatus', () => {
  it('returns operational for null', () => {
    expect(getOverallStatus(null)).toBe('operational');
  });

  it('returns operational for a perfect rate of 1', () => {
    expect(getOverallStatus(1)).toBe('operational');
  });

  it('returns operational for a rate well above the operational threshold', () => {
    expect(getOverallStatus(0.995)).toBe('operational');
  });

  it('returns operational at the exact operational boundary of 0.99', () => {
    expect(getOverallStatus(0.99)).toBe('operational');
  });

  it('returns degraded just under the operational boundary', () => {
    expect(getOverallStatus(0.989)).toBe('degraded');
  });

  it('returns degraded for a rate well within the degraded range', () => {
    expect(getOverallStatus(0.97)).toBe('degraded');
  });

  it('returns degraded at the exact issues boundary of 0.95', () => {
    expect(getOverallStatus(0.95)).toBe('degraded');
  });

  it('returns issues just under the issues boundary', () => {
    expect(getOverallStatus(0.949)).toBe('issues');
  });

  it('returns issues for a low rate', () => {
    expect(getOverallStatus(0.5)).toBe('issues');
  });
});
