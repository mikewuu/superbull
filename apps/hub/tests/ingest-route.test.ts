import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeSource {
  id: string;
  name: string;
  url: string;
  token: string;
  created_at: Date;
}

const { sources, recordedCalls } = vi.hoisted(() => {
  return {
    sources: new Map<string, FakeSource>(),
    recordedCalls: [] as Array<{ sourceId: string; events: unknown[] }>,
  };
});

vi.mock('../src/lib/sources/find-source-by-id', () => {
  return {
    async findSourceById(id: string) {
      return sources.get(id) ?? null;
    },
  };
});

vi.mock('../src/lib/ingest/record-ingest-events', () => {
  return {
    async recordIngestEvents(args: { sourceId: string; events: unknown[] }) {
      recordedCalls.push(args);
      return { accepted: args.events.length, deduped: 0 };
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  sources.clear();
  recordedCalls.length = 0;
  sources.set('source-1', {
    id: 'source-1',
    name: 'proxy-a',
    url: 'http://proxy-a.local',
    token: 'proxy-secret',
    created_at: new Date(),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function request(body: unknown, token = 'proxy-secret'): NextRequest {
  return new NextRequest('http://localhost/api/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ingest', () => {
  it('accepts events authenticated with the source token and converts fields to camelCase', async () => {
    const route = await import('../src/app/api/ingest/route');

    const response = await route.POST(
      request({
        source_id: 'source-1',
        events: [
          {
            uuid: 'evt-1',
            type: 'job.completed',
            queue_name: 'q',
            ts: 100,
            job_name: 'do-thing',
            job_id: '42',
            duration_ms: 10,
            wait_ms: 5,
          },
        ],
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ accepted: 1, deduped: 0 });
    expect(recordedCalls).toHaveLength(1);
    expect(recordedCalls[0]).toEqual({
      sourceId: 'source-1',
      events: [
        {
          uuid: 'evt-1',
          type: 'job.completed',
          queueName: 'q',
          jobName: 'do-thing',
          jobId: '42',
          ts: 100,
          durationMs: 10,
          waitMs: 5,
          failedReason: undefined,
          counts: undefined,
          workerCount: undefined,
          oldestWaitingMs: undefined,
        },
      ],
    });
  });

  it('rejects an unknown source with 401', async () => {
    const route = await import('../src/app/api/ingest/route');

    const response = await route.POST(
      request({ source_id: 'no-such-source', events: [] }, 'anything'),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(401);
  });

  it('rejects a token that does not match the stored source token', async () => {
    const route = await import('../src/app/api/ingest/route');

    const response = await route.POST(
      request({ source_id: 'source-1', events: [] }, 'wrong-token'),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(401);
  });

  it('is not guarded by HUB_API_TOKEN — a correct source token is enough', async () => {
    vi.stubEnv('HUB_API_TOKEN', 'some-other-hub-token');
    const route = await import('../src/app/api/ingest/route');

    const response = await route.POST(request({ source_id: 'source-1', events: [] }), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });

  it('rejects a batch over 500 events', async () => {
    const route = await import('../src/app/api/ingest/route');
    const events = Array.from({ length: 501 }, (_, index) => ({
      uuid: `evt-${index}`,
      type: 'job.completed',
      queue_name: 'q',
      ts: index,
    }));

    const response = await route.POST(request({ source_id: 'source-1', events }), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(400);
  });
});
