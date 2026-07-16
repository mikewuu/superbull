import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeConnector {
  id: string;
  name: string;
  url: string;
  token: string;
  created_at: Date;
}

const SUPERBULL_API_TOKEN = 'test-token';

const { connectors } = vi.hoisted(() => {
  return { connectors: new Map<string, FakeConnector>() };
});

vi.mock('../src/lib/connectors/list-connectors-legacy', () => {
  return {
    async listConnectorsLegacy() {
      return Array.from(connectors.values());
    },
  };
});

vi.mock('../src/lib/connectors/find-connector-by-id-legacy', () => {
  return {
    async findConnectorByIdLegacy(id: string) {
      return connectors.get(id) ?? null;
    },
  };
});

vi.mock('../src/lib/connectors/create-connector-legacy', () => {
  return {
    async createConnectorLegacy(args: { name: string; url: string; token: string }) {
      const connector: FakeConnector = { id: crypto.randomUUID(), ...args, created_at: new Date() };
      connectors.set(connector.id, connector);
      return connector;
    },
  };
});

vi.mock('../src/lib/connectors/delete-connector-legacy', () => {
  return {
    async deleteConnectorLegacy(id: string) {
      connectors.delete(id);
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  connectors.clear();
  vi.stubEnv('SUPERBULL_API_TOKEN', SUPERBULL_API_TOKEN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function authedRequest(
  url: string,
  init: { method?: string; headers?: HeadersInit; body?: string } = {},
): NextRequest {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${SUPERBULL_API_TOKEN}`);
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

  it('DELETE returns 204 for a known connector and 404 for an unknown one', async () => {
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
