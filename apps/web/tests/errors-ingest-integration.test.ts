/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../convex/_generated/api';
import {
  INTERNAL_TOKEN,
  assertDefined,
  makeTestClient,
  seedConnector,
  seedWorkspace,
} from './convex/test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

describe('ingest.record error group integration', () => {
  it('creates an error group when a job.failed event is recorded', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [
        {
          uuid: 'evt-1',
          type: 'job.failed',
          queueName: 'emails',
          jobId: 'job-1',
          ts: 100,
          failedReason: 'SMTP timeout',
        },
      ],
    });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      queueName: 'emails',
      message: 'SMTP timeout',
      count: 1,
      lastJobId: 'job-1',
    });
  });

  it('does not create an error group for a non-failed event', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [{ uuid: 'evt-1', type: 'job.completed', queueName: 'emails', ts: 100 }],
    });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    expect(groups).toHaveLength(0);
  });

  it('does not double-increment the group count for a deduped uuid', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    const event = {
      uuid: 'evt-dup',
      type: 'job.failed',
      queueName: 'emails',
      ts: 100,
      failedReason: 'SMTP timeout',
    };

    await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [event],
    });
    await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [event],
    });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    expect(groups).toHaveLength(1);
    expect(assertDefined(groups[0]).count).toBe(1);
  });

  it('increments the group count for two distinct failed events with the same fingerprint', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [
        {
          uuid: 'evt-1',
          type: 'job.failed',
          queueName: 'emails',
          ts: 100,
          failedReason: 'SMTP timeout',
        },
        {
          uuid: 'evt-2',
          type: 'job.failed',
          queueName: 'emails',
          ts: 200,
          failedReason: 'SMTP timeout',
        },
      ],
    });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    expect(groups).toHaveLength(1);
    expect(assertDefined(groups[0]).count).toBe(2);
  });
});
