import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAnnotation {
  id: string;
  sourceId: string;
  label: string;
  ts: number;
}

const HUB_API_TOKEN = 'test-token';

const { annotations } = vi.hoisted(() => {
  return { annotations: [] as FakeAnnotation[] };
});

vi.mock('../src/lib/deploy-annotations/create-deploy-annotation', () => {
  return {
    async createDeployAnnotation(args: { sourceId: string; label: string; ts: number }) {
      const annotation: FakeAnnotation = { id: crypto.randomUUID(), ...args };
      annotations.push(annotation);
      return annotation;
    },
  };
});

vi.mock('../src/lib/deploy-annotations/list-deploy-annotations', () => {
  return {
    async listDeployAnnotations(args: { sourceId: string; fromTs?: number; toTs?: number }) {
      return annotations.filter((annotation) => {
        if (annotation.sourceId !== args.sourceId) {
          return false;
        }
        if (args.fromTs !== undefined && annotation.ts < args.fromTs) {
          return false;
        }
        if (args.toTs !== undefined && annotation.ts > args.toTs) {
          return false;
        }
        return true;
      });
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  annotations.length = 0;
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

describe('annotations REST routes', () => {
  it('POST creates an annotation and returns 201 with the full object', async () => {
    const route = await import('../src/app/api/annotations/route');

    const response = await route.POST(
      authedRequest('http://localhost/api/annotations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: 'source-1', label: 'v1.2.3', ts: 1000 }),
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ source_id: 'source-1', label: 'v1.2.3', ts: 1000 });
    expect(body.id).toBeTruthy();
  });

  it('POST defaults ts to now when omitted', async () => {
    const route = await import('../src/app/api/annotations/route');
    const before = Date.now();

    const response = await route.POST(
      authedRequest('http://localhost/api/annotations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: 'source-1', label: 'deploy' }),
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ts).toBeGreaterThanOrEqual(before);
  });

  it('POST rejects an invalid body with 400', async () => {
    const route = await import('../src/app/api/annotations/route');

    const response = await route.POST(
      authedRequest('http://localhost/api/annotations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: 'source-1', label: '' }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(400);
  });

  it('POST rejects requests without a valid bearer token', async () => {
    const route = await import('../src/app/api/annotations/route');

    const response = await route.POST(
      new NextRequest('http://localhost/api/annotations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: 'source-1', label: 'v1' }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(401);
  });

  it('GET lists annotations scoped by source and range', async () => {
    const route = await import('../src/app/api/annotations/route');
    await route.POST(
      authedRequest('http://localhost/api/annotations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: 'source-1', label: 'too-early', ts: 50 }),
      }),
      { params: Promise.resolve({}) },
    );
    await route.POST(
      authedRequest('http://localhost/api/annotations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source_id: 'source-1', label: 'in-range', ts: 150 }),
      }),
      { params: Promise.resolve({}) },
    );

    const response = await route.GET(
      authedRequest('http://localhost/api/annotations?source_id=source-1&from_ts=100&to_ts=200'),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.annotations).toHaveLength(1);
    expect(body.annotations[0]).toMatchObject({ label: 'in-range' });
  });

  it('GET rejects requests without a valid bearer token', async () => {
    const route = await import('../src/app/api/annotations/route');

    const response = await route.GET(
      new NextRequest('http://localhost/api/annotations?source_id=source-1'),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(401);
  });
});
