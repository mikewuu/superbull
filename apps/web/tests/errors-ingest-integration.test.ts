/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { beforeEach, describe, expect, it } from 'vitest';
import schema from '../convex/schema';

const INTERNAL_TOKEN = 'test-internal-token';

const createSourceRef = makeFunctionReference<'mutation'>('proxySources:create');
const ingestRecordRef = makeFunctionReference<'mutation'>('ingest:record');
const listGroupsRef = makeFunctionReference<'query'>('errors:listGroups');

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../convex/**/*.ts'));
}

async function createSource(t: ReturnType<typeof makeTestClient>) {
  return await t.mutation(createSourceRef, {
    internalToken: INTERNAL_TOKEN,
    name: 'proxy-a',
    url: 'https://proxy-a.example.com',
    token: 'secret',
  });
}

describe('ingest.record error group integration', () => {
  it('creates an error group when a job.failed event is recorded', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await t.mutation(ingestRecordRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
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

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
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
    const source = await createSource(t);

    await t.mutation(ingestRecordRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      events: [{ uuid: 'evt-1', type: 'job.completed', queueName: 'emails', ts: 100 }],
    });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(groups).toHaveLength(0);
  });

  it('does not double-increment the group count for a deduped uuid', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    const event = {
      uuid: 'evt-dup',
      type: 'job.failed',
      queueName: 'emails',
      ts: 100,
      failedReason: 'SMTP timeout',
    };

    await t.mutation(ingestRecordRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      events: [event],
    });
    await t.mutation(ingestRecordRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      events: [event],
    });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(1);
  });

  it('increments the group count for two distinct failed events with the same fingerprint', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await t.mutation(ingestRecordRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
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

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });
});
