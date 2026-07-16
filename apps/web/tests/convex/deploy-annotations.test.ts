/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { INTERNAL_TOKEN, makeTestClient, seedConnector, seedWorkspace } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

describe('deployAnnotations (TRANSITIONAL internalToken hub API)', () => {
  it('creates an annotation and returns the full object', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    const created = await t.mutation(api.deployAnnotations.create, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      label: 'v1.2.3',
      ts: 1000,
    });

    expect(created).toMatchObject({ workspaceId, connectorId, label: 'v1.2.3', ts: 1000 });
  });

  it('create throws for an unknown connector', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.deployAnnotations.create, {
        internalToken: INTERNAL_TOKEN,
        connectorId: 'not-a-real-id',
        label: 'v1.2.3',
        ts: 1000,
      }),
    ).rejects.toThrow(/unknown connector/);
  });

  it('list returns annotations for a connector ordered most-recent-first and filters by range', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await t.mutation(api.deployAnnotations.create, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      label: 'v1',
      ts: 100,
    });
    await t.mutation(api.deployAnnotations.create, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      label: 'v2',
      ts: 200,
    });

    const all = await t.query(api.deployAnnotations.list, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
    });
    expect(all.map((a) => a.label)).toEqual(['v2', 'v1']);

    const inRange = await t.query(api.deployAnnotations.list, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      fromTs: 150,
      toTs: 250,
    });
    expect(inRange.map((a) => a.label)).toEqual(['v2']);
  });

  it('remove deletes the annotation', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    const created = await t.mutation(api.deployAnnotations.create, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      label: 'v1',
      ts: 100,
    });

    await t.mutation(api.deployAnnotations.remove, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });

    const all = await t.query(api.deployAnnotations.list, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
    });
    expect(all).toHaveLength(0);
  });

  it('throws with the wrong internal token on every function', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await expect(
      t.mutation(api.deployAnnotations.create, {
        internalToken: 'wrong',
        connectorId,
        label: 'v1',
        ts: 100,
      }),
    ).rejects.toThrow();
    await expect(
      t.query(api.deployAnnotations.list, { internalToken: 'wrong', connectorId }),
    ).rejects.toThrow();
  });
});

describe('deployAnnotations.listByWorkspace (user-facing)', () => {
  it('is scoped to the caller workspace and connector', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await t.mutation(api.deployAnnotations.create, {
      internalToken: INTERNAL_TOKEN,
      connectorId,
      label: 'v1',
      ts: 100,
    });

    const listed = await asMember.query(api.deployAnnotations.listByWorkspace, {
      workspaceId,
      connectorId,
    });
    expect(listed).toHaveLength(1);

    const outsider = await seedWorkspace(t);
    await expect(
      outsider.asMember.query(api.deployAnnotations.listByWorkspace, { workspaceId, connectorId }),
    ).rejects.toThrow();
  });
});
