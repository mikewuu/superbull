/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import {
  INTERNAL_TOKEN,
  assertDefined,
  makeTestClient,
  seedConnector,
  seedWorkspace,
} from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

describe('ingest.record (TRANSITIONAL)', () => {
  it('records events and returns accepted count', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    const result = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [
        { uuid: 'evt-1', type: 'job.completed', queueName: 'q', ts: 1 },
        { uuid: 'evt-2', type: 'job.failed', queueName: 'q', ts: 2, failedReason: 'boom' },
      ],
    });

    expect(result).toEqual({ accepted: 2, deduped: 0 });
    const count = await t.query(api.ingest.countByConnector, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
    });
    expect(count).toBe(2);

    const events = await t.run(async (ctx) => ctx.db.query('ingestEvents').collect());
    expect(events.every((event) => event.workspaceId === workspaceId)).toBe(true);
    // the job.failed event should have spawned an error group
    const groups = await t.run(async (ctx) => ctx.db.query('errorGroups').collect());
    expect(groups).toHaveLength(1);
    expect(assertDefined(groups[0]).workspaceId).toBe(workspaceId);
  });

  it('dedupes events by uuid across separate calls', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    const event = { uuid: 'evt-dup', type: 'job.completed', queueName: 'q', ts: 1 };

    const first = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [event],
    });
    const second = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [event],
    });

    expect(first).toEqual({ accepted: 1, deduped: 0 });
    expect(second).toEqual({ accepted: 0, deduped: 1 });
    const count = await t.query(api.ingest.countByConnector, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
    });
    expect(count).toBe(1);
  });

  it('dedupes events by uuid within the same call', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    const event = { uuid: 'evt-same-call', type: 'job.completed', queueName: 'q', ts: 1 };

    const result = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [event, event],
    });

    expect(result).toEqual({ accepted: 1, deduped: 1 });
  });

  it('throws for an unknown connector', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.ingest.record, {
        internalToken: INTERNAL_TOKEN,
        connectorId: 'not-a-real-id',
        events: [],
      }),
    ).rejects.toThrow(/unknown connector/);
  });

  it('throws with the wrong internal token', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await expect(
      t.mutation(api.ingest.record, { internalToken: 'wrong-token', connectorId, events: [] }),
    ).rejects.toThrow();
    await expect(
      t.query(api.ingest.countByConnector, { internalToken: 'wrong-token', connectorId }),
    ).rejects.toThrow();
  });

  it('countByConnector returns 0 for an unknown connector id', async () => {
    const t = makeTestClient();

    const count = await t.query(api.ingest.countByConnector, {
      internalToken: INTERNAL_TOKEN,
      connectorId: 'not-a-real-id',
    });
    expect(count).toBe(0);
  });
});

describe('ingest.recordBatch (gateway contract)', () => {
  it('accepts snake_case protocol events and stores them camelCase, scoped to the workspace', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    const result = await t.mutation(api.ingest.recordBatch, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [
        {
          uuid: 'evt-a',
          type: 'job.completed',
          queue_name: 'emails',
          ts: 10,
          duration_ms: 42,
          wait_ms: 5,
        },
        {
          uuid: 'evt-b',
          type: 'job.failed',
          queue_name: 'emails',
          ts: 11,
          failed_reason: 'boom',
        },
      ],
    });

    expect(result).toEqual({ accepted: 2, deduped: 0 });
    const events = await t.run(async (ctx) => ctx.db.query('ingestEvents').collect());
    expect(events).toHaveLength(2);
    const completed = events.find((event) => event.uuid === 'evt-a');
    expect(completed).toMatchObject({
      workspaceId,
      connectorId,
      queueName: 'emails',
      durationMs: 42,
      waitMs: 5,
    });
  });

  it('dedupes by uuid like record', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    const event = { uuid: 'evt-dup', type: 'job.completed', queue_name: 'q', ts: 1 };

    const first = await t.mutation(api.ingest.recordBatch, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [event],
    });
    const second = await t.mutation(api.ingest.recordBatch, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [event],
    });

    expect(first).toEqual({ accepted: 1, deduped: 0 });
    expect(second).toEqual({ accepted: 0, deduped: 1 });
  });

  it('throws for an unknown connector', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);

    await expect(
      t.mutation(api.ingest.recordBatch, {
        internalToken: INTERNAL_TOKEN,
        connectorId: workspaceId as unknown as Id<'connectors'>,
        events: [],
      }),
    ).rejects.toThrow();
  });
});
