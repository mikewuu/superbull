import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The middleware now meters authenticated calls; keep the suite infra-free
// with an in-memory counter in place of redis.
const counters = vi.hoisted(() => new Map<string, number>());

vi.mock('../src/lib/redis/connect-redis', () => ({
  connectRedis: async () => ({
    incr: async (key: string) => {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    },
    expire: async () => 1,
  }),
}));

beforeEach(() => {
  vi.resetModules();
  counters.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('authenticateHubToken', () => {
  it('passes the request through when the bearer token matches', async () => {
    vi.stubEnv('SUPERBULL_API_TOKEN', 'secret-token');
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers({ authorization: 'Bearer secret-token' }) };

    await expect(authenticateHubToken(req)).resolves.toBe(req);
  });

  it('throws unauthorized when the bearer token does not match', async () => {
    vi.stubEnv('SUPERBULL_API_TOKEN', 'secret-token');
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers({ authorization: 'Bearer wrong-token' }) };

    await expect(authenticateHubToken(req)).rejects.toThrow();
  });

  it('throws unauthorized when the authorization header is missing', async () => {
    vi.stubEnv('SUPERBULL_API_TOKEN', 'secret-token');
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers() };

    await expect(authenticateHubToken(req)).rejects.toThrow();
  });

  it('fails closed with a 500 body when SUPERBULL_API_TOKEN is unset', async () => {
    vi.stubEnv('SUPERBULL_API_TOKEN', undefined);
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers({ authorization: 'Bearer anything' }) };
    const result = await authenticateHubToken(req);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'SUPERBULL_API_TOKEN is not configured' });
  });
});
