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

const { sources } = vi.hoisted(() => {
  return { sources: new Map<string, FakeSource>() };
});

vi.mock('../src/lib/sources/list-sources', () => {
  return {
    async listSources() {
      return Array.from(sources.values());
    },
  };
});

vi.mock('../src/lib/sources/find-source-by-id', () => {
  return {
    async findSourceById(id: string) {
      return sources.get(id) ?? null;
    },
  };
});

vi.mock('../src/lib/sources/create-source', () => {
  return {
    async createSource(args: { name: string; url: string; token: string }) {
      const source: FakeSource = { id: crypto.randomUUID(), ...args, created_at: new Date() };
      sources.set(source.id, source);
      return source;
    },
  };
});

vi.mock('../src/lib/sources/delete-source', () => {
  return {
    async deleteSource(id: string) {
      sources.delete(id);
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  sources.clear();
  vi.stubEnv('HUB_API_TOKEN', HUB_API_TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function authedRequest(
  url: string,
  init: { method?: string; headers?: HeadersInit; body?: string } = {},
): NextRequest {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${HUB_API_TOKEN}`);
  return new NextRequest(url, { method: init.method, headers, body: init.body });
}

describe('sources REST routes', () => {
  it('GET excludes the token field', async () => {
    const collection = await import('../src/app/api/sources/route');
    await collection.POST(
      authedRequest('http://localhost/api/sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'proxy-a',
          url: 'https://proxy-a.example.com',
          token: 'secret',
        }),
      }),
      { params: Promise.resolve({}) },
    );

    const response = await collection.GET(authedRequest('http://localhost/api/sources'), {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).not.toHaveProperty('token');
    expect(body.sources[0].name).toBe('proxy-a');
  });

  it('POST validates the body and returns the full created object with 201', async () => {
    const collection = await import('../src/app/api/sources/route');

    const response = await collection.POST(
      authedRequest('http://localhost/api/sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'proxy-b',
          url: 'https://proxy-b.example.com',
          token: 'secret',
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ name: 'proxy-b', url: 'https://proxy-b.example.com' });
    expect(body).not.toHaveProperty('token');
    expect(body.id).toBeTruthy();
    expect(body.created_at).toBeTruthy();
  });

  it('POST rejects an invalid body', async () => {
    const collection = await import('../src/app/api/sources/route');

    const response = await collection.POST(
      authedRequest('http://localhost/api/sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '', url: 'not-a-url', token: '' }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(400);
  });

  it('DELETE returns 204 for a known source and 404 for an unknown one', async () => {
    const collection = await import('../src/app/api/sources/route');
    const item = await import('../src/app/api/sources/[sourceId]/route');

    const createResponse = await collection.POST(
      authedRequest('http://localhost/api/sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'proxy-c',
          url: 'https://proxy-c.example.com',
          token: 'secret',
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const created = await createResponse.json();

    const deleteResponse = await item.DELETE(
      authedRequest(`http://localhost/api/sources/${created.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ sourceId: created.id }) },
    );
    expect(deleteResponse.status).toBe(204);

    const missingResponse = await item.DELETE(
      authedRequest('http://localhost/api/sources/missing-id', { method: 'DELETE' }),
      { params: Promise.resolve({ sourceId: 'missing-id' }) },
    );
    expect(missingResponse.status).toBe(404);
  });

  it('rejects requests without a valid bearer token', async () => {
    const collection = await import('../src/app/api/sources/route');

    const response = await collection.GET(new NextRequest('http://localhost/api/sources'), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(401);
  });
});
