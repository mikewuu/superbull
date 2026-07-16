/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import schema from '../../convex/schema';

const statusPages = {
  getBySource: makeFunctionReference<'query'>('statusPages:getBySource'),
  upsert: makeFunctionReference<'mutation'>('statusPages:upsert'),
  setLogo: makeFunctionReference<'mutation'>('statusPages:setLogo'),
  generateLogoUploadUrl: makeFunctionReference<'mutation'>('statusPages:generateLogoUploadUrl'),
  getPublicPage: makeFunctionReference<'query'>('statusPages:getPublicPage'),
  getPublicUptime: makeFunctionReference<'query'>('statusPages:getPublicUptime'),
};

const INTERNAL_TOKEN = 'test-internal-token';

const DAY_MS = 86_400_000;
const todayStart = Math.floor(Date.now() / DAY_MS) * DAY_MS;
const tsForDaysAgo = (n: number) => todayStart - n * DAY_MS + 3_600_000;
const indexForDaysAgo = (n: number) => 89 - n;

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

async function createSource(t: ReturnType<typeof makeTestClient>, name = 'proxy-a') {
  return await t.mutation(api.proxySources.create, {
    internalToken: INTERNAL_TOKEN,
    name,
    url: `https://${name}.example.com`,
    token: 'secret',
  });
}

async function upsertConfig(
  t: ReturnType<typeof makeTestClient>,
  args: {
    sourceId: Id<'proxySources'>;
    slug: string;
    isEnabled?: boolean;
    title?: string;
    queueNames?: string[];
  },
) {
  return await t.mutation(statusPages.upsert, {
    internalToken: INTERNAL_TOKEN,
    sourceId: args.sourceId,
    slug: args.slug,
    isEnabled: args.isEnabled ?? true,
    title: args.title ?? 'Status Page',
    ...(args.queueNames ? { queueNames: args.queueNames } : {}),
  });
}

async function insertEvent(
  t: ReturnType<typeof makeTestClient>,
  args: { sourceId: Id<'proxySources'>; uuid: string; type: string; queueName: string; ts: number },
) {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', args);
  });
}

describe('statusPages', () => {
  it('upsert creates a config that getBySource returns', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    const created = await upsertConfig(t, {
      sourceId: source._id,
      slug: 'my-status-page',
      title: 'My Status',
    });

    const found = await t.query(statusPages.getBySource, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });

    expect(found).toMatchObject({ _id: created._id, slug: 'my-status-page', title: 'My Status' });
  });

  it('getBySource returns null for a malformed id', async () => {
    const t = makeTestClient();

    const found = await t.query(statusPages.getBySource, {
      internalToken: INTERNAL_TOKEN,
      sourceId: 'not-a-real-id',
    });

    expect(found).toBeNull();
  });

  it('getBySource returns null when no config exists yet', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    const found = await t.query(statusPages.getBySource, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });

    expect(found).toBeNull();
  });

  it('upsert throws for invalid slug shapes', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    for (const slug of ['ab', 'ABC-de', 'abc de']) {
      await expect(upsertConfig(t, { sourceId: source._id, slug })).rejects.toThrow();
    }
  });

  it('rejects a slug already used by a different source, but allows re-saving the same source with its own slug', async () => {
    const t = makeTestClient();
    const sourceA = await createSource(t, 'proxy-a');
    const sourceB = await createSource(t, 'proxy-b');

    const configA = await upsertConfig(t, { sourceId: sourceA._id, slug: 'foo-bar' });

    await expect(upsertConfig(t, { sourceId: sourceB._id, slug: 'foo-bar' })).rejects.toThrow();

    const resaved = await upsertConfig(t, { sourceId: sourceA._id, slug: 'foo-bar' });
    expect(resaved._id).toBe(configA._id);
  });

  it('patches the existing config in place across repeated upserts with different slugs', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    const first = await upsertConfig(t, { sourceId: source._id, slug: 'first-slug' });
    const second = await upsertConfig(t, { sourceId: source._id, slug: 'second-slug' });

    expect(second._id).toBe(first._id);

    const found = await t.query(statusPages.getBySource, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(found).toMatchObject({ _id: first._id, slug: 'second-slug' });
  });

  it('getPublicPage and getPublicUptime return null for an unknown slug', async () => {
    const t = makeTestClient();

    expect(await t.query(statusPages.getPublicPage, { slug: 'no-such-slug' })).toBeNull();
    expect(await t.query(statusPages.getPublicUptime, { slug: 'no-such-slug' })).toBeNull();
  });

  it('getPublicPage and getPublicUptime return null when the config is disabled', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await upsertConfig(t, { sourceId: source._id, slug: 'disabled-page', isEnabled: false });

    expect(await t.query(statusPages.getPublicPage, { slug: 'disabled-page' })).toBeNull();
    expect(await t.query(statusPages.getPublicUptime, { slug: 'disabled-page' })).toBeNull();
  });

  it('getPublicPage returns title, null logo_url, and queues when enabled', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await upsertConfig(t, {
      sourceId: source._id,
      slug: 'enabled-page',
      title: 'My Queue Status',
      queueNames: ['queue-a', 'queue-b'],
    });

    const page = await t.query(statusPages.getPublicPage, { slug: 'enabled-page' });

    expect(page).toMatchObject({
      title: 'My Queue Status',
      logo_url: null,
      queues: ['queue-a', 'queue-b'],
    });
  });

  it('getPublicPage defaults queues to [] when queueNames is unset', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await upsertConfig(t, { sourceId: source._id, slug: 'no-queues-page' });

    const page = await t.query(statusPages.getPublicPage, { slug: 'no-queues-page' });

    expect(page).toMatchObject({ queues: [] });
  });

  it('setLogo attaches a logo and flips getPublicPage.logo_url from null to a string', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    const config = await upsertConfig(t, { sourceId: source._id, slug: 'logo-page' });

    const uploadUrl = await t.mutation(statusPages.generateLogoUploadUrl, {
      internalToken: INTERNAL_TOKEN,
    });
    expect(typeof uploadUrl).toBe('string');

    const before = await t.query(statusPages.getPublicPage, { slug: 'logo-page' });
    expect(before?.logo_url).toBeNull();

    const storageId = await t.run(async (ctx) => {
      return await ctx.storage.store(new Blob(['fake-logo']));
    });
    const patched = await t.mutation(statusPages.setLogo, {
      internalToken: INTERNAL_TOKEN,
      configId: config._id,
      storageId,
    });
    expect(patched.logoStorageId).toBe(storageId);

    const after = await t.query(statusPages.getPublicPage, { slug: 'logo-page' });
    expect(typeof after?.logo_url).toBe('string');
  });

  it('aggregates all queues into overall when queueNames is unset, with 90 daily buckets', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await upsertConfig(t, { sourceId: source._id, slug: 'uptime-all' });

    for (let i = 0; i < 9; i++) {
      await insertEvent(t, {
        sourceId: source._id,
        uuid: `completed-${i}`,
        type: 'job.completed',
        queueName: 'q1',
        ts: tsForDaysAgo(0),
      });
    }
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'failed-0',
      type: 'job.failed',
      queueName: 'q1',
      ts: tsForDaysAgo(0),
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'active-noise',
      type: 'job.active',
      queueName: 'q1',
      ts: tsForDaysAgo(0),
    });

    const uptime = await t.query(statusPages.getPublicUptime, { slug: 'uptime-all' });

    expect(uptime.overall).toHaveLength(90);
    expect(uptime.queues).toEqual([]);
    expect(uptime.overall_rate_90d).toBe(0.9);

    const todayBucket = uptime.overall[indexForDaysAgo(0)];
    expect(todayBucket).toMatchObject({ rate: 0.9, total: 10 });

    const emptyBucket = uptime.overall[indexForDaysAgo(5)];
    expect(emptyBucket).toMatchObject({ rate: null, total: 0 });
  });

  it('scopes overall to configured queues, aggregating them while excluding other queues on the source', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await upsertConfig(t, {
      sourceId: source._id,
      slug: 'uptime-scoped',
      queueNames: ['queue-a', 'queue-b'],
    });

    const day = tsForDaysAgo(10);
    const idx = indexForDaysAgo(10);

    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'a-1',
      type: 'job.completed',
      queueName: 'queue-a',
      ts: day,
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'a-2',
      type: 'job.completed',
      queueName: 'queue-a',
      ts: day,
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'a-3',
      type: 'job.completed',
      queueName: 'queue-a',
      ts: day,
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'a-4',
      type: 'job.failed',
      queueName: 'queue-a',
      ts: day,
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'b-1',
      type: 'job.completed',
      queueName: 'queue-b',
      ts: day,
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'b-2',
      type: 'job.completed',
      queueName: 'queue-b',
      ts: day,
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'other-1',
      type: 'job.completed',
      queueName: 'other-queue',
      ts: day,
    });
    await insertEvent(t, {
      sourceId: source._id,
      uuid: 'other-2',
      type: 'job.failed',
      queueName: 'other-queue',
      ts: day,
    });

    const uptime = await t.query(statusPages.getPublicUptime, { slug: 'uptime-scoped' });

    expect(uptime.overall).toHaveLength(90);
    expect(uptime.queues).toHaveLength(2);
    expect(uptime.overall[idx]).toMatchObject({ total: 6, rate: 5 / 6 });

    const queueA = uptime.queues.find((q: { name: string }) => q.name === 'queue-a');
    const queueB = uptime.queues.find((q: { name: string }) => q.name === 'queue-b');
    expect(queueA.days).toHaveLength(90);
    expect(queueB.days).toHaveLength(90);
    expect(queueA.days[idx]).toMatchObject({ total: 4, rate: 0.75 });
    expect(queueB.days[idx]).toMatchObject({ total: 2, rate: 1 });
    expect(queueA.rate_90d).toBe(0.75);
    expect(queueB.rate_90d).toBe(1);
  });

  it('throws with the wrong internal token on upsert', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await expect(
      t.mutation(statusPages.upsert, {
        internalToken: 'wrong-token',
        sourceId: source._id,
        slug: 'wrong-token-page',
        isEnabled: true,
        title: 'Title',
      }),
    ).rejects.toThrow();
  });

  it('throws with the wrong internal token on getBySource', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await expect(
      t.query(statusPages.getBySource, {
        internalToken: 'wrong-token',
        sourceId: source._id,
      }),
    ).rejects.toThrow();
  });
});
