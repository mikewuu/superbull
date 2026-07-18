/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { INTERNAL_TOKEN, makeTestClient, seedConnector, seedProject } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

type TestClient = ReturnType<typeof makeTestClient>;

async function seedFailedEvents(
  t: TestClient,
  projectId: Id<'projects'>,
  connectorId: Id<'connectors'>,
  queueName: string,
  count: number,
): Promise<void> {
  await t.run(async (ctx) => {
    for (let i = 0; i < count; i++) {
      await ctx.db.insert('ingestEvents', {
        projectId,
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
  projectId: Id<'projects'>,
  connectorId: Id<'connectors'>,
  queueName: string,
  args: { waiting: number; workerCount: number },
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', {
      projectId,
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
  projectId: Id<'projects'>,
  connectorId: Id<'connectors'>,
  queueName: string,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('ingestEvents', {
      projectId,
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
  projectId: Id<'projects'>,
  connectorId: Id<'connectors'>,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert('errorGroups', {
      projectId,
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
  it('creates a rule and lists it back, scoped to the project', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    const created = await asMember.mutation(api.alerts.create, {
      projectId,
      connectorId,
      type: 'failed_threshold',
      threshold: 5,
      windowMinutes: 10,
      email: 'a@example.com',
      isEnabled: true,
    });
    const rules = await asMember.query(api.alerts.list, { projectId });

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ _id: created._id, type: 'failed_threshold', threshold: 5 });

    const outsider = await seedProject(t);
    expect(
      await outsider.asMember.query(api.alerts.list, { projectId: outsider.projectId }),
    ).toHaveLength(0);
  });

  it('rejects a rule without windowMinutes', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);

    await expect(
      asMember.mutation(api.alerts.create, {
        projectId,
        type: 'new_error_group',
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/windowMinutes/);
  });

  it('rejects a failed_threshold rule without a threshold', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);

    await expect(
      asMember.mutation(api.alerts.create, {
        projectId,
        type: 'failed_threshold',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/threshold/);
  });

  it('rejects a stuck_queue rule without a queueName', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);

    await expect(
      asMember.mutation(api.alerts.create, {
        projectId,
        type: 'stuck_queue',
        windowMinutes: 5,
        email: 'a@example.com',
        isEnabled: true,
      }),
    ).rejects.toThrow(/queueName/);
  });

  it('rejects a connectorId from a different project', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const other = await seedProject(t);
    const foreignConnectorId = await seedConnector(t, other.projectId);

    await expect(
      asMember.mutation(api.alerts.create, {
        projectId,
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
    const { projectId, asMember } = await seedProject(t);
    const created = await asMember.mutation(api.alerts.create, {
      projectId,
      type: 'new_error_group',
      windowMinutes: 5,
      email: 'a@example.com',
      isEnabled: true,
    });

    const updated = await asMember.mutation(api.alerts.update, {
      projectId,
      id: created._id,
      isEnabled: false,
    });

    expect(updated.isEnabled).toBe(false);
  });

  it('remove deletes the rule and its alert state', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await seedFailedEvents(t, projectId, connectorId, 'emails', 3);
    const created = await asMember.mutation(api.alerts.create, {
      projectId,
      connectorId,
      type: 'failed_threshold',
      queueName: 'emails',
      threshold: 1,
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });
    await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });

    await asMember.mutation(api.alerts.remove, { projectId, id: created._id });

    const rules = await asMember.query(api.alerts.list, { projectId });
    const states = await asMember.query(api.alerts.listStates, { projectId });
    expect(rules).toHaveLength(0);
    expect(states).toHaveLength(0);
  });

  it('rejects an unauthenticated caller', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);

    await expect(t.query(api.alerts.list, { projectId })).rejects.toThrow();
    await expect(
      t.mutation(api.alerts.create, {
        projectId,
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
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await seedFailedEvents(t, projectId, connectorId, 'emails', 3);
    await asMember.mutation(api.alerts.create, {
      projectId,
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
      project_id: projectId,
    });
  });

  it('does not fire below the threshold', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await seedFailedEvents(t, projectId, connectorId, 'emails', 1);
    await asMember.mutation(api.alerts.create, {
      projectId,
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
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await seedFailedEvents(t, projectId, connectorId, 'emails', 3);
    await asMember.mutation(api.alerts.create, {
      projectId,
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
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await seedSnapshot(t, projectId, connectorId, 'emails', { waiting: 5, workerCount: 2 });
    await asMember.mutation(api.alerts.create, {
      projectId,
      connectorId,
      type: 'stuck_queue',
      queueName: 'emails',
      windowMinutes: 60,
      email: 'a@example.com',
      isEnabled: true,
    });

    const first = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(first.to_notify[0]?.kind).toBe('firing');

    await seedCompletedEvent(t, projectId, connectorId, 'emails');
    const second = await t.mutation(api.alerts.evaluate, { internalToken: INTERNAL_TOKEN });
    expect(second.to_notify[0]?.kind).toBe('resolved');
  });

  it('a rule with no connectorId sweeps every connector in its own project only', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    const other = await seedProject(t);
    const otherConnectorId = await seedConnector(t, other.projectId);
    await seedFailedEvents(t, projectId, connectorId, 'emails', 3);
    await seedFailedEvents(t, other.projectId, otherConnectorId, 'emails', 10);

    await asMember.mutation(api.alerts.create, {
      projectId,
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
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await seedErrorGroup(t, projectId, connectorId);
    await asMember.mutation(api.alerts.create, {
      projectId,
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
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await seedFailedEvents(t, projectId, connectorId, 'emails', 5);
    await asMember.mutation(api.alerts.create, {
      projectId,
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
  it('digestSummary groups per-connector stats with their projectId', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId, { name: 'connector-a' });
    await t.mutation(api.ingest.recordBatch, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      events: [{ uuid: '1', type: 'job.completed', queue_name: 'q', ts: Date.now() }],
    });

    const { perConnector } = await t.query(api.alerts.digestSummary, {
      internalToken: INTERNAL_TOKEN,
      sinceTs: 0,
    });

    expect(perConnector).toHaveLength(1);
    expect(perConnector[0]).toMatchObject({
      projectId,
      connectorId,
      connectorName: 'connector-a',
      completed: 1,
    });
  });

  it('listAllRulesForDigest returns every rule regardless of isEnabled', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    await asMember.mutation(api.alerts.create, {
      projectId,
      type: 'new_error_group',
      windowMinutes: 5,
      email: 'a@example.com',
      isEnabled: false,
    });

    const rules = await t.query(api.alerts.listAllRulesForDigest, {
      internalToken: INTERNAL_TOKEN,
    });
    expect(rules).toEqual([{ email: 'a@example.com', projectId }]);
  });
});
