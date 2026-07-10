import { NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('authenticateHubToken', () => {
  it('passes the request through when the bearer token matches', async () => {
    vi.stubEnv('HUB_API_TOKEN', 'secret-token');
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers({ authorization: 'Bearer secret-token' }) };

    expect(authenticateHubToken(req)).toBe(req);
  });

  it('throws unauthorized when the bearer token does not match', async () => {
    vi.stubEnv('HUB_API_TOKEN', 'secret-token');
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers({ authorization: 'Bearer wrong-token' }) };

    expect(() => authenticateHubToken(req)).toThrow();
  });

  it('throws unauthorized when the authorization header is missing', async () => {
    vi.stubEnv('HUB_API_TOKEN', 'secret-token');
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers() };

    expect(() => authenticateHubToken(req)).toThrow();
  });

  it('fails closed with a 500 body when HUB_API_TOKEN is unset', async () => {
    vi.stubEnv('HUB_API_TOKEN', undefined);
    const { authenticateHubToken } = await import('../src/lib/auth/authenticate-hub-token');

    const req = { headers: new Headers({ authorization: 'Bearer anything' }) };
    const result = authenticateHubToken(req);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'HUB_API_TOKEN is not configured' });
  });
});
