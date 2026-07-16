/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { INTERNAL_TOKEN, makeTestClient, seedConnector, seedWorkspace } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

describe('connectors (user-facing, workspace-scoped)', () => {
  it('createConnector requires membership and scopes by workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);

    const created = await asMember.mutation(api.connectors.createConnector, {
      workspaceId,
      name: 'my-app',
      tokenHash: 'a'.repeat(64),
    });
    expect(created.workspaceId).toBe(workspaceId);

    const listed = await asMember.query(api.connectors.listByWorkspace, { workspaceId });
    expect(listed).toHaveLength(1);
  });

  it('rejects an unauthenticated caller', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);

    await expect(
      t.mutation(api.connectors.createConnector, {
        workspaceId,
        name: 'my-app',
        tokenHash: 'a'.repeat(64),
      }),
    ).rejects.toThrow();
  });

  it('a member of another workspace cannot list or read this workspace connectors', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const outsider = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await expect(
      outsider.asMember.query(api.connectors.listByWorkspace, { workspaceId }),
    ).rejects.toThrow();
    const got = await outsider.asMember.query(api.connectors.getById, {
      workspaceId: outsider.workspaceId,
      connectorId,
    });
    expect(got).toBeNull();
  });

  it('removeConnector cascades to child rows', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await t.run(async (ctx) => {
      await ctx.db.insert('ingestEvents', {
        workspaceId,
        connectorId,
        uuid: 'q:completed:1:1',
        type: 'job.completed',
        queueName: 'emails',
        ts: 1000,
      });
      await ctx.db.insert('errorGroups', {
        workspaceId,
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
      await ctx.db.insert('deployAnnotations', { workspaceId, connectorId, label: 'v1', ts: 1000 });
      await ctx.db.insert('statusPageConfigs', {
        workspaceId,
        connectorId,
        slug: 'connector-a',
        isEnabled: true,
        title: 'Connector A',
      });
    });

    await asMember.mutation(api.connectors.removeConnector, { workspaceId, connectorId });

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

describe('connectors (TRANSITIONAL internalToken hub API)', () => {
  it('create attaches the connector to the oldest workspace', async () => {
    const t = makeTestClient();
    const first = await seedWorkspace(t);
    await seedWorkspace(t);

    const created = await t.mutation(api.connectors.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'legacy-proxy',
      url: 'https://proxy.example.com',
      token: 'secret',
    });

    expect(created.workspaceId).toBe(first.workspaceId);
  });

  it('upsertByName patches the existing connector by name within the oldest workspace', async () => {
    const t = makeTestClient();
    await seedWorkspace(t);

    const created = await t.mutation(api.connectors.upsertByName, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-upsert',
      url: 'https://old.example.com',
      token: 'old-token',
    });
    const updated = await t.mutation(api.connectors.upsertByName, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-upsert',
      url: 'https://new.example.com',
      token: 'new-token',
    });

    expect(updated._id).toBe(created._id);
    expect(updated).toMatchObject({ url: 'https://new.example.com', token: 'new-token' });
    const all = await t.query(api.connectors.list, { internalToken: INTERNAL_TOKEN });
    expect(all).toHaveLength(1);
  });

  it('list/findById/create/remove reject the wrong internal token', async () => {
    const t = makeTestClient();
    await seedWorkspace(t);

    await expect(t.query(api.connectors.list, { internalToken: 'wrong' })).rejects.toThrow();
    await expect(
      t.query(api.connectors.findById, { internalToken: 'wrong', id: 'not-a-real-id' }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.connectors.create, {
        internalToken: 'wrong',
        name: 'x',
        url: 'https://x.example.com',
        token: 't',
      }),
    ).rejects.toThrow();
  });

  it('remove deletes the connector', async () => {
    const t = makeTestClient();
    await seedWorkspace(t);

    const created = await t.mutation(api.connectors.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });
    await t.mutation(api.connectors.remove, { internalToken: INTERNAL_TOKEN, id: created._id });

    const all = await t.query(api.connectors.list, { internalToken: INTERNAL_TOKEN });
    expect(all).toHaveLength(0);
  });
});

describe('connectors (gateway contract)', () => {
  it('findByEnrollmentTokenHash resolves connectorId + workspaceId', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await t.run(async (ctx) =>
      ctx.db.insert('connectors', { workspaceId, name: 'gw-connector', tokenHash: 'b'.repeat(64) }),
    );

    const found = await t.query(api.connectors.findByEnrollmentTokenHash, {
      internalToken: INTERNAL_TOKEN,
      tokenHash: 'b'.repeat(64),
    });
    expect(found).toEqual({ connectorId, workspaceId, name: 'gw-connector' });

    const missing = await t.query(api.connectors.findByEnrollmentTokenHash, {
      internalToken: INTERNAL_TOKEN,
      tokenHash: 'c'.repeat(64),
    });
    expect(missing).toBeNull();
  });

  it('markConnected and markDisconnected stamp timestamps', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

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
