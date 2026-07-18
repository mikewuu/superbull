import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiKey = 'sbh_rate-limit-test-token';
const userId = 'user-1';

// Deterministic in-memory redis: the suite runs without infra, and the test
// drives the limit by seeding counters directly.
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

vi.mock('../src/lib/deploy-annotations/list-deploy-annotations', () => ({
  async listDeployAnnotations() {
    return [];
  },
}));

vi.mock('../src/lib/auth/find-caller', () => ({
  findCaller: async (rawToken: string) =>
    rawToken === apiKey ? { userId, projectId: null } : null,
}));

vi.mock('../src/lib/connectors/find-connector-by-id-for-user', () => ({
  findConnectorByIdForUser: async (args: { connectorId: string }) => ({ id: args.connectorId }),
}));

beforeEach(() => {
  vi.resetModules();
  counters.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function listAnnotationsRequest(): NextRequest {
  return new NextRequest('http://localhost/api/annotations?source_id=source-1', {
    headers: { authorization: `Bearer ${apiKey}` },
  });
}

function mcpRequest(): Request {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
}

function exhaustRateLimit() {
  const window = Math.floor(Date.now() / 60_000);
  counters.set(`api-rate:${userId}:${window}`, 120);
  counters.set(`api-rate:${userId}:${window + 1}`, 120);
}

describe('shared per-user rate limit', () => {
  it('lets an authenticated request through under the limit', async () => {
    const route = await import('../src/app/api/annotations/route');

    const response = await route.GET(listAnnotationsRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
  });

  it('returns 429 + retry-after on both REST and MCP from the one shared window', async () => {
    const route = await import('../src/app/api/annotations/route');
    exhaustRateLimit();

    const restResponse = await route.GET(listAnnotationsRequest(), {
      params: Promise.resolve({}),
    });
    expect(restResponse.status).toBe(429);
    expect(Number(restResponse.headers.get('retry-after'))).toBeGreaterThan(0);
    const restBody = (await restResponse.json()) as { type: string };
    expect(restBody.type).toBe('rate_limited');

    const mcp = await import('../src/app/api/mcp/route');
    const mcpResponse = await mcp.POST(mcpRequest());
    expect(mcpResponse.status).toBe(429);
    expect(Number(mcpResponse.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
