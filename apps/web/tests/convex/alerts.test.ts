/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import schema from '../../convex/schema';

const INTERNAL_TOKEN = 'test-internal-token';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

type TestConvexClient = ReturnType<typeof makeTestClient>;

async function seedSource(t: TestConvexClient, name = 'proxy-a'): Promise<Id<'proxySources'>> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('proxySources', {
      name,
      url: `https://${name}.example.com`,
      token: 't',
    });
  });
}

async function seedFailedEvents(
  t: TestConvexClient,
  sourceId: Id<'proxySources'>,
  queueName: string,
  count: number,
): Promise<void> {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      await ctx.db.insert('ingestEvents', {
        sourceId,
        uuid: `failed-${queueName}-${i}`,
        type: 'job.failed',
        queueName,
        ts: Date.now(),
      });
    }
  });
}

async function seedSnapshot(
  t: TestConvexClient,
  sourceId: Id<'proxySources'>,
  queueName: string,
  args: { waiting: number; workerCount: number },
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', {
      sourceId,
      uuid: `snapshot-${queueName}-${Date.now()}-${Math.random()}`,
      type: 'queue.snapshot',
      queueName,
      ts: Date.now(),
      counts: { waiting: args.waiting, prioritized: 0 },
      workerCount: args.workerCount,
    });
  });
}

async function seedCompletedEvent(
  t: TestConvexClient,
  sourceId: Id<'proxySources'>,
  queueName: string,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', {
      sourceId,
      uuid: `completed-${queueName}-${Date.now()}-${Math.random()}`,
      type: 'job.completed',
      queueName,
      ts: Date.now(),
    });
  });
}

async function seedErrorGroup(t: TestConvexClient, sourceId: Id<'proxySources'>): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('errorGroups', {
      sourceId,
      fingerprint: 'fp-1',
      queueName: 'emails',
      message: 'boom',
      state: 'open',
      count: 1,
      firstSeenTs: Date.now(),
      lastSeenTs: Date.now(),
      isRegression: false,
    });
  });
}

describe('alerts rules CRUD', () => {
  it('creates a rule and lists it back', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);

    const created = await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'failed_threshold',
      threshold: 5,
      windowMinutes: 10,
      email: 'a@example.com',
      isEnabled: true,
    });
    const rules = await t.query(api.alerts.list, { internalToken: INTERNAL_TOKEN });

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ _id: created._id, type: 'failed_threshold', threshold: 5 });
  });

  it('rejects a rule without windowMinutes', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.alerts.create, {
        internalToken: INTERNAL_TOKEN,
        type: 'new_error_group',
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/windowMinutes/);
  });

  it('rejects a failed_threshold rule without a threshold', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.alerts.create, {
        internalToken: INTERNAL_TOKEN,
        type: 'failed_threshold',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/threshold/);
  });

  it('rejects a stuck_queue rule without a queueName', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.alerts.create, {
        internalToken: INTERNAL_TOKEN,
        type: 'stuck_queue',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/queueName/);
  });

  it('rejects a worker_loss rule without a queueName', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.alerts.create, {
        internalToken: INTERNAL_TOKEN,
        type: 'worker_loss',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/queueName/);
  });

  it('update toggles isEnabled', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      type: 'new_error_group',
      windowMinutes: 5,
      email: 'a@example.com',
      isEnabled: true,
    });

    const updated = await t.mutation(api.alerts.update, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
      isEnabled: false,
    });

    expect(updated.isEnabled).toBe(false);
  });

  it('update rejects clearing queueName off a stuck_queue rule', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      type: 'stuck_queue',
      queueName: 'emails',
      windowMinutes: 5,
      email: 'a@example.com',
      isEnabled: true,
    });

    await expect(
      t.mutation(api.alerts.update, {
        internalToken: INTERNAL_TOKEN,
        id: created._id,
        queueName: '',
      }),
    ).rejects.toThrow(/queueName/);
  });

  it('remove deletes the rule and its alert state', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedFailedEvents(t, sourceId, 'emails', 3);
    const created = await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 1,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });
    await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    await t.mutation(api.alerts.remove, { internalToken: INTERNAL_TOKEN, id: created._id });

    const rules = await t.query(api.alerts.list, { internalToken: INTERNAL_TOKEN });
    const states = await t.query(api.alerts.listStates, { internalToken: INTERNAL_TOKEN });
    expect(rules).toHaveLength(0);
    expect(states).toHaveLength(0);
  });

  it('rejects every function with the wrong internal token', async () => {
    const t = makeTestClient();

    await expect(t.query(api.alerts.list, { internalToken: 'wrong' })).rejects.toThrow();
    await expect(
      t.mutation(api.alerts.create, {
        internalToken: 'wrong',
        type: 'new_error_group',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow();
    await expect(t.mutation(api.alerts.evaluate, { internalToken: 'wrong' })).rejects.toThrow();
  });
});

describe('alerts evaluate', () => {
  it('fires a failed_threshold rule once the count reaches the threshold', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedFailedEvents(t, sourceId, 'emails', 3);
    await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 2,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    expect(result.evaluated).toBe(1);
    expect(result.to_notify).toHaveLength(1);
    expect(result.to_notify[0]).toMatchObject({ kind: 'firing', type: 'failed_threshold' });
    const states = await t.query(api.alerts.listStates, { internalToken: INTERNAL_TOKEN });
    expect(states[0]).toMatchObject({ state: 'firing' });
  });

  it('does not fire a failed_threshold rule below the threshold', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedFailedEvents(t, sourceId, 'emails', 1);
    await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 5,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    expect(result.to_notify).toHaveLength(0);
    const states = await t.query(api.alerts.listStates, { internalToken: INTERNAL_TOKEN });
    expect(states).toHaveLength(0);
  });

  it('does not re-notify while a rule stays firing (cooldown)', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedFailedEvents(t, sourceId, 'emails', 3);
    await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 1,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const first = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    const second = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    expect(first.to_notify).toHaveLength(1);
    expect(second.to_notify).toHaveLength(0);
  });

  it('transitions a stuck_queue rule from firing to resolved once completions appear', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedSnapshot(t, sourceId, 'emails', { waiting: 5, workerCount: 2 });
    await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'stuck_queue',
      queueName: 'emails',
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const first = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(first.to_notify).toHaveLength(1);
    expect(first.to_notify[0]?.kind).toBe('firing');

    await seedCompletedEvent(t, sourceId, 'emails');
    const second = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    expect(second.to_notify).toHaveLength(1);
    expect(second.to_notify[0]?.kind).toBe('resolved');
    const states = await t.query(api.alerts.listStates, { internalToken: INTERNAL_TOKEN });
    expect(states[0]).toMatchObject({ state: 'resolved' });
  });

  it('fires a worker_loss rule when the latest snapshot has zero workers', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedSnapshot(t, sourceId, 'emails', { waiting: 0, workerCount: 0 });
    await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'worker_loss',
      queueName: 'emails',
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    expect(result.to_notify).toHaveLength(1);
    expect(result.to_notify[0]?.type).toBe('worker_loss');
  });

  it('fires a new_error_group rule when a fresh error group appears in the window', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedErrorGroup(t, sourceId);
    await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'new_error_group',
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    expect(result.to_notify).toHaveLength(1);
    expect(result.to_notify[0]?.type).toBe('new_error_group');
  });

  it('skips disabled rules entirely', async () => {
    const t = makeTestClient();
    const sourceId = await seedSource(t);
    await seedFailedEvents(t, sourceId, 'emails', 5);
    await t.mutation(api.alerts.create, {
      internalToken: INTERNAL_TOKEN,
      sourceId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 1,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: false,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    expect(result.evaluated).toBe(0);
    expect(result.to_notify).toHaveLength(0);
  });
});
