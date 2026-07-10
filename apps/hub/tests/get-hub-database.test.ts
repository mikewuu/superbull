import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getHubDatabase', () => {
  it('memory mode returns the same instance twice', async () => {
    vi.stubEnv('HUB_DATABASE', 'memory');

    const { getHubDatabase } = await import('../src/lib/db/get-hub-database');
    const first = getHubDatabase();
    const second = getHubDatabase();

    expect(first).toBe(second);
  });

  it('postgres mode without DATABASE_URL throws a helpful error', async () => {
    vi.stubEnv('HUB_DATABASE', 'postgres');
    vi.stubEnv('DATABASE_URL', undefined);

    const { getHubDatabase } = await import('../src/lib/db/get-hub-database');

    expect(() => getHubDatabase()).toThrow('DATABASE_URL is required when HUB_DATABASE=postgres');
  });
});
