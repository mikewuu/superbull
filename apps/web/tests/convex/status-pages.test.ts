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

const DAY_MS = 86_400_000;
const todayStart = Math.floor(Date.now() / DAY_MS) * DAY_MS;
const tsForDaysAgo = (n: number) => todayStart - n * DAY_MS + 3_600_000;
const indexForDaysAgo = (n: number) => 89 - n;

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

type TestClient = ReturnType<typeof makeTestClient>;

async function insertEvent(
  t: TestClient,
  args: {
    workspaceId: Id<'workspaces'>;
    connectorId: Id<'connectors'>;
    uuid: string;
    type: string;
    queueName: string;
    ts: number;
  },
) {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', args);
  });
}

describe('statusPages (user-facing config)', () => {
  it('upsert creates a config that getByConnector returns', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    const created = await asMember.mutation(api.statusPages.upsert, {
      workspaceId,
      connectorId,
      slug: 'my-status-page',
      isEnabled: true,
      title: 'My Status',
    });

    const found = await asMember.query(api.statusPages.getByConnector, {
      workspaceId,
      connectorId,
    });
    expect(found).toMatchObject({ _id: created._id, slug: 'my-status-page', title: 'My Status' });
  });

  it('upsert throws for invalid slug shapes', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    for (const slug of ['ab', 'ABC-de', 'abc de']) {
      await expect(
        asMember.mutation(api.statusPages.upsert, {
          workspaceId,
          connectorId,
          slug,
          isEnabled: true,
          title: 'x',
        }),
      ).rejects.toThrow();
    }
  });

  it('rejects a slug already used by a different connector, but allows re-saving the same connector', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorA = await seedConnector(t, workspaceId, { name: 'connector-a' });
    const connectorB = await seedConnector(t, workspaceId, { name: 'connector-b' });

    const configA = await asMember.mutation(api.statusPages.upsert, {
      workspaceId,
      connectorId: connectorA,
      slug: 'foo-bar',
      isEnabled: true,
      title: 'A',
    });

    await expect(
      asMember.mutation(api.statusPages.upsert, {
        workspaceId,
        connectorId: connectorB,
        slug: 'foo-bar',
        isEnabled: true,
        title: 'B',
      }),
    ).rejects.toThrow();

    const resaved = await asMember.mutation(api.statusPages.upsert, {
      workspaceId,
      connectorId: connectorA,
      slug: 'foo-bar',
      isEnabled: true,
      title: 'A again',
    });
    expect(resaved._id).toBe(configA._id);
  });

  it('rejects a connector from a different workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const other = await seedWorkspace(t);
    const foreignConnectorId = await seedConnector(t, other.workspaceId);

    await expect(
      asMember.mutation(api.statusPages.upsert, {
        workspaceId,
        connectorId: foreignConnectorId,
        slug: 'nope',
        isEnabled: true,
        title: 'x',
      }),
    ).rejects.toThrow(/unknown connector/);
  });
});

describe('statusPages public queries (unauthenticated, interface unchanged)', () => {
  it('getPublicPage and getPublicUptime return null for an unknown slug', async () => {
    const t = makeTestClient();

    expect(await t.query(api.statusPages.getPublicPage, { slug: 'no-such-slug' })).toBeNull();
    expect(await t.query(api.statusPages.getPublicUptime, { slug: 'no-such-slug' })).toBeNull();
  });

  it('getPublicPage and getPublicUptime return null when the config is disabled', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await asMember.mutation(api.statusPages.upsert, {
      workspaceId,
      connectorId,
      slug: 'disabled-page',
      isEnabled: false,
      title: 'x',
    });

    expect(await t.query(api.statusPages.getPublicPage, { slug: 'disabled-page' })).toBeNull();
    expect(await t.query(api.statusPages.getPublicUptime, { slug: 'disabled-page' })).toBeNull();
  });

  it('getPublicPage returns title, null logo_url, and queues when enabled', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await asMember.mutation(api.statusPages.upsert, {
      workspaceId,
      connectorId,
      slug: 'enabled-page',
      isEnabled: true,
      title: 'My Queue Status',
      queueNames: ['queue-a', 'queue-b'],
    });

    const page = await t.query(api.statusPages.getPublicPage, { slug: 'enabled-page' });
    expect(page).toMatchObject({
      title: 'My Queue Status',
      logo_url: null,
      queues: ['queue-a', 'queue-b'],
    });
  });

  it('aggregates all queues into overall when queueNames is unset, with 90 daily buckets', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await asMember.mutation(api.statusPages.upsert, {
      workspaceId,
      connectorId,
      slug: 'uptime-all',
      isEnabled: true,
      title: 'x',
    });

    for (let i = 0; i < 9; i++) {
      await insertEvent(t, {
        workspaceId,
        connectorId,
        uuid: `completed-${i}`,
        type: 'job.completed',
        queueName: 'q1',
        ts: tsForDaysAgo(0),
      });
    }
    await insertEvent(t, {
      workspaceId,
      connectorId,
      uuid: 'failed-0',
      type: 'job.failed',
      queueName: 'q1',
      ts: tsForDaysAgo(0),
    });

    const uptime = await t.query(api.statusPages.getPublicUptime, { slug: 'uptime-all' });

    expect(assertDefined(uptime).overall).toHaveLength(90);
    expect(assertDefined(uptime).queues).toEqual([]);
    expect(assertDefined(uptime).overall_rate_90d).toBe(0.9);
    expect(assertDefined(uptime).overall[indexForDaysAgo(0)]).toMatchObject({
      rate: 0.9,
      total: 10,
    });
    expect(assertDefined(uptime).overall[indexForDaysAgo(5)]).toMatchObject({
      rate: null,
      total: 0,
    });
  });

  it('scopes overall to configured queues, aggregating them while excluding other queues on the connector', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await asMember.mutation(api.statusPages.upsert, {
      workspaceId,
      connectorId,
      slug: 'uptime-scoped',
      isEnabled: true,
      title: 'x',
      queueNames: ['queue-a', 'queue-b'],
    });

    const day = tsForDaysAgo(10);
    const idx = indexForDaysAgo(10);
    const events: Array<[string, string, string]> = [
      ['a-1', 'job.completed', 'queue-a'],
      ['a-2', 'job.completed', 'queue-a'],
      ['a-3', 'job.completed', 'queue-a'],
      ['a-4', 'job.failed', 'queue-a'],
      ['b-1', 'job.completed', 'queue-b'],
      ['b-2', 'job.completed', 'queue-b'],
      ['other-1', 'job.completed', 'other-queue'],
      ['other-2', 'job.failed', 'other-queue'],
    ];
    for (const [uuid, type, queueName] of events) {
      await insertEvent(t, { workspaceId, connectorId, uuid, type, queueName, ts: day });
    }

    const uptime = await t.query(api.statusPages.getPublicUptime, { slug: 'uptime-scoped' });

    expect(assertDefined(uptime).overall).toHaveLength(90);
    expect(assertDefined(uptime).queues).toHaveLength(2);
    expect(assertDefined(uptime).overall[idx]).toMatchObject({ total: 6, rate: 5 / 6 });

    const queueA = assertDefined(assertDefined(uptime).queues.find((q) => q.name === 'queue-a'));
    const queueB = assertDefined(assertDefined(uptime).queues.find((q) => q.name === 'queue-b'));
    expect(queueA.days[idx]).toMatchObject({ total: 4, rate: 0.75 });
    expect(queueB.days[idx]).toMatchObject({ total: 2, rate: 1 });
    expect(queueA.rate_90d).toBe(0.75);
    expect(queueB.rate_90d).toBe(1);
  });
});
