import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSource {
  id: string;
  name: string;
  url: string;
  token: string;
  created_at: Date;
}

const HUB_API_TOKEN = 'test-token';

const { sourcesByName } = vi.hoisted(() => {
  return { sourcesByName: new Map<string, FakeSource>() };
});

vi.mock('../src/lib/sources/upsert-source-by-name', () => {
  return {
    async upsertSourceByName(args: { name: string; url: string; token: string }) {
      const existing = sourcesByName.get(args.name);
      const source: FakeSource = {
        id: existing?.id ?? crypto.randomUUID(),
        name: args.name,
        url: args.url,
        token: args.token,
        created_at: existing?.created_at ?? new Date(),
      };
      sourcesByName.set(args.name, source);
      return source;
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  sourcesByName.clear();
  vi.stubEnv('HUB_API_TOKEN', HUB_API_TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function authedRequest(
  url: string,
  init: { headers?: HeadersInit; body?: string } = {},
): NextRequest {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${HUB_API_TOKEN}`);
  return new NextRequest(url, { method: 'POST', headers, body: init.body });
}

describe('POST /api/sources/register', () => {
  it('registers a new source and never echoes the token', async () => {
    const route = await import('../src/app/api/sources/register/route');

    const response = await route.POST(
      authedRequest('http://localhost/api/sources/register', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'proxy-a',
          url: 'http://proxy-a.local:4650',
          token: 'proxy-secret',
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      source_id: expect.any(String),
      name: 'proxy-a',
      url: 'http://proxy-a.local:4650',
    });
    expect(body).not.toHaveProperty('token');
  });

  it('upserts by name: registering the same name twice returns the same source_id', async () => {
    const route = await import('../src/app/api/sources/register/route');

    const first = await route.POST(
      authedRequest('http://localhost/api/sources/register', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'proxy-a', url: 'http://a:1', token: 'tok-1' }),
      }),
      { params: Promise.resolve({}) },
    );
    const second = await route.POST(
      authedRequest('http://localhost/api/sources/register', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'proxy-a', url: 'http://a:2', token: 'tok-2' }),
      }),
      { params: Promise.resolve({}) },
    );

    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(secondBody.source_id).toBe(firstBody.source_id);
    expect(secondBody.url).toBe('http://a:2');
  });

  it('rejects an invalid body', async () => {
    const route = await import('../src/app/api/sources/register/route');

    const response = await route.POST(
      authedRequest('http://localhost/api/sources/register', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '', url: 'not-a-url', token: '' }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(400);
  });

  it('rejects requests without a valid hub bearer token', async () => {
    const route = await import('../src/app/api/sources/register/route');

    const response = await route.POST(
      new NextRequest('http://localhost/api/sources/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'proxy-a', url: 'http://a:1', token: 'tok' }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(401);
  });
});
