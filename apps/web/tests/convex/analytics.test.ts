/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { INTERNAL_TOKEN, makeTestClient, seedConnector, seedWorkspace } from './test-helpers';

const HOUR = 3_600_000;

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

async function recordEvents(
  t: ReturnType<typeof makeTestClient>,
  connectorId: Awaited<ReturnType<typeof seedConnector>>,
  events: Array<{
    uuid: string;
    type: string;
    queueName: string;
    ts: number;
    durationMs?: number;
    waitMs?: number;
  }>,
) {
  return await t.mutation(api.ingest.recordBatch, {
    internalToken: INTERNAL_TOKEN,
    connectorId,
    events: events.map((event) => ({
      uuid: event.uuid,
      type: event.type,
      queue_name: event.queueName,
      ts: event.ts,
      duration_ms: event.durationMs,
      wait_ms: event.waitMs,
    })),
  });
}

describe('analytics.throughputSeries', () => {
  it('buckets completed and failed counts by bucketMinutes', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await recordEvents(t, connectorId, [
      { uuid: '1', type: 'job.completed', queueName: 'q', ts: 100 },
      { uuid: '2', type: 'job.completed', queueName: 'q', ts: 200 },
      { uuid: '3', type: 'job.failed', queueName: 'q', ts: 500 },
      { uuid: '4', type: 'job.completed', queueName: 'q', ts: HOUR + 100 },
      { uuid: '5', type: 'job.failed', queueName: 'q', ts: 2 * HOUR },
    ]);

    const result = await asMember.query(api.analytics.throughputSeries, {
      workspaceId,
      connectorId,
      fromTs: 0,
      toTs: 2 * HOUR,
      bucketMinutes: 60,
    });

    expect(result).toEqual({
      points: [
        { bucket_ts: 0, completed: 2, failed: 1 },
        { bucket_ts: HOUR, completed: 1, failed: 0 },
        { bucket_ts: 2 * HOUR, completed: 0, failed: 1 },
      ],
      truncated: false,
    });
  });

  it('zero-fills buckets with no events', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await recordEvents(t, connectorId, [
      { uuid: '1', type: 'job.completed', queueName: 'q', ts: 0 },
    ]);

    const result = await asMember.query(api.analytics.throughputSeries, {
      workspaceId,
      connectorId,
      fromTs: 0,
      toTs: 2 * HOUR,
      bucketMinutes: 60,
    });

    expect(result).toEqual({
      points: [
        { bucket_ts: 0, completed: 1, failed: 0 },
        { bucket_ts: HOUR, completed: 0, failed: 0 },
        { bucket_ts: 2 * HOUR, completed: 0, failed: 0 },
      ],
      truncated: false,
    });
  });

  it('filters by queueName when provided', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await recordEvents(t, connectorId, [
      { uuid: '1', type: 'job.completed', queueName: 'emails', ts: 0 },
      { uuid: '2', type: 'job.completed', queueName: 'exports', ts: 0 },
      { uuid: '3', type: 'job.completed', queueName: 'exports', ts: 0 },
    ]);

    const result = await asMember.query(api.analytics.throughputSeries, {
      workspaceId,
      connectorId,
      queueName: 'exports',
      fromTs: 0,
      toTs: 0,
      bucketMinutes: 60,
    });

    expect(result).toEqual({
      points: [{ bucket_ts: 0, completed: 2, failed: 0 }],
      truncated: false,
    });
  });

  it('rejects a connector from a different workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const other = await seedWorkspace(t);
    const foreignConnectorId = await seedConnector(t, other.workspaceId);

    await expect(
      asMember.query(api.analytics.throughputSeries, {
        workspaceId,
        connectorId: foreignConnectorId,
        fromTs: 0,
        toTs: 0,
        bucketMinutes: 60,
      }),
    ).rejects.toThrow(/unknown connector/);
  });

  it('rejects an unauthenticated caller', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await expect(
      t.query(api.analytics.throughputSeries, {
        workspaceId,
        connectorId,
        fromTs: 0,
        toTs: 0,
        bucketMinutes: 60,
      }),
    ).rejects.toThrow();
  });
});

describe('analytics.latencySeries', () => {
  it('computes p50/p95 from waitMs and durationMs of terminal events', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await recordEvents(t, connectorId, [
      { uuid: '1', type: 'job.completed', queueName: 'q', ts: 0, waitMs: 40, durationMs: 500 },
      { uuid: '2', type: 'job.completed', queueName: 'q', ts: 0, waitMs: 10, durationMs: 100 },
      { uuid: '3', type: 'job.failed', queueName: 'q', ts: 0, waitMs: 30, durationMs: 300 },
      { uuid: '4', type: 'job.completed', queueName: 'q', ts: 0, waitMs: 20, durationMs: 200 },
    ]);

    const result = await asMember.query(api.analytics.latencySeries, {
      workspaceId,
      connectorId,
      fromTs: 0,
      toTs: 0,
      bucketMinutes: 60,
    });

    expect(result).toEqual({
      points: [{ bucket_ts: 0, wait_p50: 30, wait_p95: 40, run_p50: 300, run_p95: 500 }],
      truncated: false,
    });
  });

  it('returns null percentiles for buckets with no terminal events', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    const result = await asMember.query(api.analytics.latencySeries, {
      workspaceId,
      connectorId,
      fromTs: 0,
      toTs: HOUR,
      bucketMinutes: 60,
    });

    expect(result).toEqual({
      points: [
        { bucket_ts: 0, wait_p50: null, wait_p95: null, run_p50: null, run_p95: null },
        { bucket_ts: HOUR, wait_p50: null, wait_p95: null, run_p50: null, run_p95: null },
      ],
      truncated: false,
    });
  });
});

describe('analytics.queueTotals', () => {
  it('aggregates completed/failed and sums job_seconds per queue', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await recordEvents(t, connectorId, [
      { uuid: '1', type: 'job.completed', queueName: 'q1', ts: 0, durationMs: 1000 },
      { uuid: '2', type: 'job.completed', queueName: 'q1', ts: 0, durationMs: 2000 },
      { uuid: '3', type: 'job.failed', queueName: 'q1', ts: 0 },
      { uuid: '4', type: 'job.failed', queueName: 'q2', ts: 0 },
    ]);

    const result = await asMember.query(api.analytics.queueTotals, {
      workspaceId,
      connectorId,
      fromTs: 0,
      toTs: 0,
    });

    expect(result).toEqual({
      totals: [
        { queue_name: 'q1', completed: 2, failed: 1, job_seconds: 3 },
        { queue_name: 'q2', completed: 0, failed: 1, job_seconds: null },
      ],
      truncated: false,
    });
  });
});

describe('analytics.heatmap', () => {
  it('builds a 7x24 UTC weekday x hour matrix from terminal events', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    const sunday10am = Date.UTC(2024, 0, 7, 10, 30, 0);
    const monday3pm = Date.UTC(2024, 0, 8, 15, 0, 0);
    await recordEvents(t, connectorId, [
      { uuid: '1', type: 'job.completed', queueName: 'q', ts: sunday10am },
      { uuid: '2', type: 'job.failed', queueName: 'q', ts: monday3pm },
      { uuid: '3', type: 'queue.snapshot', queueName: 'q', ts: monday3pm },
    ]);

    const result = await asMember.query(api.analytics.heatmap, {
      workspaceId,
      connectorId,
      fromTs: sunday10am,
      toTs: monday3pm,
    });

    expect(result.timezone).toBe('UTC');
    expect(result.truncated).toBe(false);
    expect(result.matrix[0]?.[10]).toBe(1);
    expect(result.matrix[1]?.[15]).toBe(1);
    const total = result.matrix.flat().reduce((sum, count) => sum + count, 0);
    expect(total).toBe(2);
  });
});
