/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { INTERNAL_TOKEN, makeTestClient, seedConnector, seedProject } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

describe('connectors (user-facing, project-scoped)', () => {
  it('createConnector requires membership and scopes by project', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);

    const created = await asMember.mutation(api.connectors.createConnector, {
      projectId,
      name: 'my-app',
      tokenHash: 'a'.repeat(64),
    });
    expect(created.projectId).toBe(projectId);

    const listed = await asMember.query(api.connectors.listByProject, { projectId });
    expect(listed).toHaveLength(1);
  });

  it('rejects an unauthenticated caller', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);

    await expect(
      t.mutation(api.connectors.createConnector, {
        projectId,
        name: 'my-app',
        tokenHash: 'a'.repeat(64),
      }),
    ).rejects.toThrow();
  });

  it('a member of another project cannot list or read this project connectors', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);
    const outsider = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await expect(
      outsider.asMember.query(api.connectors.listByProject, { projectId }),
    ).rejects.toThrow();
    const got = await outsider.asMember.query(api.connectors.getById, {
      projectId: outsider.projectId,
      connectorId,
    });
    expect(got).toBeNull();
  });

  it('removeConnector cascades to child rows', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await t.run(async (ctx) => {
      await ctx.db.insert('ingestEvents', {
        projectId,
        connectorId,
        uuid: 'q:completed:1:1',
        type: 'job.completed',
        queueName: 'emails',
        ts: 1000,
      });
      await ctx.db.insert('errorGroups', {
        projectId,
        connectorId,
        fingerprint: 'fp-1',
        queueName: 'emails',
        message: 'boom',
        state: 'open',
        count: 1,
        firstSeenTs: 1000,
        lastSeenTs: 1000,
        isRegression: false,
      });
      await ctx.db.insert('deployAnnotations', { projectId, connectorId, label: 'v1', ts: 1000 });
      await ctx.db.insert('statusPageConfigs', {
        projectId,
        connectorId,
        slug: 'connector-a',
        isEnabled: true,
        title: 'Connector A',
      });
    });

    await asMember.mutation(api.connectors.removeConnector, { projectId, connectorId });

    const remaining = await t.run(async (ctx) => ({
      events: await ctx.db.query('ingestEvents').collect(),
      errorGroups: await ctx.db.query('errorGroups').collect(),
      annotations: await ctx.db.query('deployAnnotations').collect(),
      statusPages: await ctx.db.query('statusPageConfigs').collect(),
      connectors: await ctx.db.query('connectors').collect(),
    }));
    expect(remaining.events).toHaveLength(0);
    expect(remaining.errorGroups).toHaveLength(0);
    expect(remaining.annotations).toHaveLength(0);
    expect(remaining.statusPages).toHaveLength(0);
    expect(remaining.connectors).toHaveLength(0);
  });
});

describe('connectors (internal user-scoped API surface)', () => {
  it('lists and resolves connectors only across the caller projects', async () => {
    const t = makeTestClient();
    const caller = await seedProject(t);
    const foreign = await seedProject(t);
    const connectorId = await seedConnector(t, caller.projectId, { name: 'mcp-connector' });
    const foreignConnectorId = await seedConnector(t, foreign.projectId);

    const all = await t.query(api.connectors.listConnectorsForUser, {
      internalToken: INTERNAL_TOKEN,
      userId: caller.userId,
    });
    expect(all).toHaveLength(1);

    const found = await t.query(api.connectors.findConnectorByIdForUser, {
      internalToken: INTERNAL_TOKEN,
      userId: caller.userId,
      connectorId,
    });
    expect(found?.name).toBe('mcp-connector');

    const hidden = await t.query(api.connectors.findConnectorByIdForUser, {
      internalToken: INTERNAL_TOKEN,
      userId: caller.userId,
      connectorId: foreignConnectorId,
    });
    expect(hidden).toBeNull();
  });

  it('listForUser, findByIdForUser, and removeForUser reject the wrong internal token', async () => {
    const t = makeTestClient();
    const { userId } = await seedProject(t);

    await expect(
      t.query(api.connectors.listConnectorsForUser, { internalToken: 'wrong', userId }),
    ).rejects.toThrow();
    await expect(
      t.query(api.connectors.findConnectorByIdForUser, {
        internalToken: 'wrong',
        userId,
        connectorId: 'not-a-real-id',
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.connectors.removeConnectorForUser, {
        internalToken: 'wrong',
        userId,
        connectorId: 'not-a-real-id',
      }),
    ).rejects.toThrow();
  });

  it('removeForUser deletes a connector the caller can access', async () => {
    const t = makeTestClient();
    const { userId, projectId } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await t.mutation(api.connectors.removeConnectorForUser, {
      internalToken: INTERNAL_TOKEN,
      userId,
      connectorId,
    });

    const all = await t.query(api.connectors.listConnectorsForUser, {
      internalToken: INTERNAL_TOKEN,
      userId,
    });
    expect(all).toHaveLength(0);
  });
});

describe('connectors (gateway contract)', () => {
  it('findByEnrollmentTokenHash resolves connectorId + projectId', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);
    const connectorId = await t.run(async (ctx) =>
      ctx.db.insert('connectors', { projectId, name: 'gw-connector', tokenHash: 'b'.repeat(64) }),
    );

    const found = await t.query(api.connectors.findByEnrollmentTokenHash, {
      internalToken: INTERNAL_TOKEN,
      tokenHash: 'b'.repeat(64),
    });
    expect(found).toEqual({ connectorId, projectId, name: 'gw-connector' });

    const missing = await t.query(api.connectors.findByEnrollmentTokenHash, {
      internalToken: INTERNAL_TOKEN,
      tokenHash: 'c'.repeat(64),
    });
    expect(missing).toBeNull();
  });

  it('markConnected and markDisconnected stamp timestamps', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await t.mutation(api.connectors.markConnected, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      version: '1.0.0',
      queues: ['emails'],
    });
    let connector = await t.run(async (ctx) => ctx.db.get(connectorId));
    expect(connector?.lastConnectedAt).toBeDefined();
    expect(connector?.version).toBe('1.0.0');

    await t.mutation(api.connectors.markDisconnected, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
    });
    connector = await t.run(async (ctx) => ctx.db.get(connectorId));
    expect(connector?.lastDisconnectedAt).toBeDefined();
  });
});
