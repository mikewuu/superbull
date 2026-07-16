/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { INTERNAL_TOKEN, makeTestClient, seedConnector, seedWorkspace } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

type TestClient = ReturnType<typeof makeTestClient>;

async function seedFailedEvents(
  t: TestClient,
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
  queueName: string,
  count: number,
): Promise<void> {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      await ctx.db.insert('ingestEvents', {
        workspaceId,
        connectorId,
        uuid: `failed-${queueName}-${i}`,
        type: 'job.failed',
        queueName,
        ts: Date.now(),
      });
    }
  });
}

async function seedSnapshot(
  t: TestClient,
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
  queueName: string,
  args: { waiting: number; workerCount: number },
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', {
      workspaceId,
      connectorId,
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
  t: TestClient,
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
  queueName: string,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', {
      workspaceId,
      connectorId,
      uuid: `completed-${queueName}-${Date.now()}-${Math.random()}`,
      type: 'job.completed',
      queueName,
      ts: Date.now(),
    });
  });
}

async function seedErrorGroup(
  t: TestClient,
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('errorGroups', {
      workspaceId,
      connectorId,
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

describe('alerts rules CRUD (user-facing)', () => {
  it('creates a rule and lists it back, scoped to the workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    const created = await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
      type: 'failed_threshold',
      threshold: 5,
      windowMinutes: 10,
      email: 'a@example.com',
      isEnabled: true,
    });
    const rules = await asMember.query(api.alerts.list, { workspaceId });

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ _id: created._id, type: 'failed_threshold', threshold: 5 });

    const outsider = await seedWorkspace(t);
    expect(
      await outsider.asMember.query(api.alerts.list, { workspaceId: outsider.workspaceId }),
    ).toHaveLength(0);
  });

  it('rejects a rule without windowMinutes', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);

    await expect(
      asMember.mutation(api.alerts.create, {
        workspaceId,
        type: 'new_error_group',
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/windowMinutes/);
  });

  it('rejects a failed_threshold rule without a threshold', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);

    await expect(
      asMember.mutation(api.alerts.create, {
        workspaceId,
        type: 'failed_threshold',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/threshold/);
  });

  it('rejects a stuck_queue rule without a queueName', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);

    await expect(
      asMember.mutation(api.alerts.create, {
        workspaceId,
        type: 'stuck_queue',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/queueName/);
  });

  it('rejects a connectorId from a different workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const other = await seedWorkspace(t);
    const foreignConnectorId = await seedConnector(t, other.workspaceId);

    await expect(
      asMember.mutation(api.alerts.create, {
        workspaceId,
        connectorId: foreignConnectorId,
        type: 'new_error_group',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/unknown connector/);
  });

  it('update toggles isEnabled', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const created = await asMember.mutation(api.alerts.create, {
      workspaceId,
      type: 'new_error_group',
      windowMinutes: 5,
      email: 'a@example.com',
      isEnabled: true,
    });

    const updated = await asMember.mutation(api.alerts.update, {
      workspaceId,
      id: created._id,
      isEnabled: false,
    });

    expect(updated.isEnabled).toBe(false);
  });

  it('remove deletes the rule and its alert state', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await seedFailedEvents(t, workspaceId, connectorId, 'emails', 3);
    const created = await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 1,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });
    await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    await asMember.mutation(api.alerts.remove, { workspaceId, id: created._id });

    const rules = await asMember.query(api.alerts.list, { workspaceId });
    const states = await asMember.query(api.alerts.listStates, { workspaceId });
    expect(rules).toHaveLength(0);
    expect(states).toHaveLength(0);
  });

  it('rejects an unauthenticated caller', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);

    await expect(t.query(api.alerts.list, { workspaceId })).rejects.toThrow();
    await expect(
      t.mutation(api.alerts.create, {
        workspaceId,
        type: 'new_error_group',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow();
  });
});

describe('alerts.evaluate (internalToken-gated cron path)', () => {
  it('fires a failed_threshold rule once the count reaches the threshold', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await seedFailedEvents(t, workspaceId, connectorId, 'emails', 3);
    await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
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
    expect(result.to_notify[0]).toMatchObject({
      kind: 'firing',
      type: 'failed_threshold',
      workspace_id: workspaceId,
    });
  });

  it('does not fire below the threshold', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await seedFailedEvents(t, workspaceId, connectorId, 'emails', 1);
    await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 5,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(result.to_notify).toHaveLength(0);
  });

  it('does not re-notify while a rule stays firing (cooldown)', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await seedFailedEvents(t, workspaceId, connectorId, 'emails', 3);
    await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
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
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await seedSnapshot(t, workspaceId, connectorId, 'emails', { waiting: 5, workerCount: 2 });
    await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
      type: 'stuck_queue',
      queueName: 'emails',
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const first = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(first.to_notify[0]?.kind).toBe('firing');

    await seedCompletedEvent(t, workspaceId, connectorId, 'emails');
    const second = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(second.to_notify[0]?.kind).toBe('resolved');
  });

  it('a rule with no connectorId sweeps every connector in its own workspace only', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    const other = await seedWorkspace(t);
    const otherConnectorId = await seedConnector(t, other.workspaceId);
    await seedFailedEvents(t, workspaceId, connectorId, 'emails', 3);
    await seedFailedEvents(t, other.workspaceId, otherConnectorId, 'emails', 10);

    await asMember.mutation(api.alerts.create, {
      workspaceId,
      type: 'failed_threshold',
      threshold: 1,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(result.to_notify[0]?.summary).toContain('3 failed jobs');
  });

  it('fires a new_error_group rule when a fresh error group appears in the window', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await seedErrorGroup(t, workspaceId, connectorId);
    await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
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
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await seedFailedEvents(t, workspaceId, connectorId, 'emails', 5);
    await asMember.mutation(api.alerts.create, {
      workspaceId,
      connectorId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 1,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: false,
    });

    const result = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(result.evaluated).toBe(0);
  });

  it('throws with the wrong internal token', async () => {
    const t = makeTestClient();
    await expect(t.mutation(api.alerts.evaluate, { internalToken: 'wrong' })).rejects.toThrow();
  });
});

describe('alerts.digestSummary / listAllRulesForDigest', () => {
  it('digestSummary groups per-connector stats with their workspaceId', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId, { name: 'connector-a' });
    await t.mutation(api.ingest.record, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [{ uuid: '1', type: 'job.completed', queueName: 'q', ts: Date.now() }],
    });

    const { perConnector } = await t.query(api.alerts.digestSummary, {
      internalToken: INTERNAL_TOKEN,
      sinceTs: 0,
    });

    expect(perConnector).toHaveLength(1);
    expect(perConnector[0]).toMatchObject({
      workspaceId,
      connectorId,
      connectorName: 'connector-a',
      completed: 1,
    });
  });

  it('listAllRulesForDigest returns every rule regardless of isEnabled', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    await asMember.mutation(api.alerts.create, {
      workspaceId,
      type: 'new_error_group',
      windowMinutes: 5,
      email: 'a@example.com',
      isEnabled: false,
    });

    const rules = await t.query(api.alerts.listAllRulesForDigest, {
      internalToken: INTERNAL_TOKEN,
    });
    expect(rules).toEqual([{ email: 'a@example.com', workspaceId }]);
  });
});
