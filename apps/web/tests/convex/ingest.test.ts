/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';

const INTERNAL_TOKEN = 'test-internal-token';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

async function createSource(t: ReturnType<typeof makeTestClient>) {
  return await t.mutation(api.proxySources.create, {
    internalToken: INTERNAL_TOKEN,
    name: 'proxy-a',
    url: 'https://proxy-a.example.com',
    token: 'secret',
  });
}

describe('ingest', () => {
  it('records events and returns accepted count', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    const result = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      events: [
        { uuid: 'evt-1', type: 'job.completed', queueName: 'q', ts: 1 },
        { uuid: 'evt-2', type: 'job.failed', queueName: 'q', ts: 2, failedReason: 'boom' },
      ],
    });

    expect(result).toEqual({ accepted: 2, deduped: 0 });
    const count = await t.query(api.ingest.countBySource, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(count).toBe(2);
  });

  it('dedupes events by uuid across separate calls', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    const event = { uuid: 'evt-dup', type: 'job.completed', queueName: 'q', ts: 1 };

    const first = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      events: [event],
    });
    const second = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      events: [event],
    });

    expect(first).toEqual({ accepted: 1, deduped: 0 });
    expect(second).toEqual({ accepted: 0, deduped: 1 });
    const count = await t.query(api.ingest.countBySource, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(count).toBe(1);
  });

  it('dedupes events by uuid within the same call', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    const event = { uuid: 'evt-same-call', type: 'job.completed', queueName: 'q', ts: 1 };

    const result = await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      events: [event, event],
    });

    expect(result).toEqual({ accepted: 1, deduped: 1 });
  });

  it('throws for an unknown source', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.ingest.record, {
        internalToken: INTERNAL_TOKEN,
        sourceId: 'not-a-real-id',
        events: [],
      }),
    ).rejects.toThrow(/unknown source/);
  });

  it('throws with the wrong internal token on record', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await expect(
      t.mutation(api.ingest.record, {
        internalToken: 'wrong-token',
        sourceId: source._id,
        events: [],
      }),
    ).rejects.toThrow();
  });

  it('throws with the wrong internal token on countBySource', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await expect(
      t.query(api.ingest.countBySource, { internalToken: 'wrong-token', sourceId: source._id }),
    ).rejects.toThrow();
  });

  it('countBySource returns 0 for an unknown source id', async () => {
    const t = makeTestClient();

    const count = await t.query(api.ingest.countBySource, {
      internalToken: INTERNAL_TOKEN,
      sourceId: 'not-a-real-id',
    });
    expect(count).toBe(0);
  });
});
