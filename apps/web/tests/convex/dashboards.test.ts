/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { makeTestClient, seedWorkspace } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = 'test-internal-token';
});

const validCard = {
  type: 'throughput' as const,
  connector_id: 'some-connector-id',
  range: '24h' as const,
};

describe('dashboards.create', () => {
  it('creates a dashboard scoped to the workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);

    const dashboard = await asMember.mutation(api.dashboards.create, {
      workspaceId,
      name: 'ops overview',
      cards: [validCard],
    });

    expect(dashboard.name).toBe('ops overview');
    expect(dashboard.cards).toEqual([validCard]);
    expect(dashboard.workspaceId).toBe(workspaceId);
  });

  it('rejects an invalid card type', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);

    await expect(
      asMember.mutation(api.dashboards.create, {
        workspaceId,
        name: 'bad',
        cards: [{ ...validCard, type: 'bogus' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('rejects an unauthenticated caller', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);

    await expect(
      t.mutation(api.dashboards.create, { workspaceId, name: 'x', cards: [] }),
    ).rejects.toThrow();
  });
});

describe('dashboards.list and findById', () => {
  it('lists only this workspace dashboards', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const other = await seedWorkspace(t);
    await asMember.mutation(api.dashboards.create, { workspaceId, name: 'a', cards: [] });
    await asMember.mutation(api.dashboards.create, { workspaceId, name: 'b', cards: [] });
    await other.asMember.mutation(api.dashboards.create, {
      workspaceId: other.workspaceId,
      name: 'other workspace',
      cards: [],
    });

    const dashboards = await asMember.query(api.dashboards.list, { workspaceId });
    expect(dashboards).toHaveLength(2);
  });

  it('findById returns null for a dashboard in a different workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const other = await seedWorkspace(t);
    const created = await asMember.mutation(api.dashboards.create, {
      workspaceId,
      name: 'a',
      cards: [],
    });

    const found = await other.asMember.query(api.dashboards.findById, {
      workspaceId: other.workspaceId,
      id: created._id,
    });
    expect(found).toBeNull();
  });
});

describe('dashboards.update', () => {
  it('patches the name only, leaving cards intact', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const created = await asMember.mutation(api.dashboards.create, {
      workspaceId,
      name: 'old name',
      cards: [validCard],
    });

    const updated = await asMember.mutation(api.dashboards.update, {
      workspaceId,
      id: created._id,
      name: 'new name',
    });

    expect(updated.name).toBe('new name');
    expect(updated.cards).toEqual([validCard]);
  });

  it('throws for a dashboard in a different workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const other = await seedWorkspace(t);
    const created = await asMember.mutation(api.dashboards.create, {
      workspaceId,
      name: 'x',
      cards: [],
    });

    await expect(
      other.asMember.mutation(api.dashboards.update, {
        workspaceId: other.workspaceId,
        id: created._id,
        name: 'y',
      }),
    ).rejects.toThrow(/unknown dashboard/);
  });
});

describe('dashboards.remove', () => {
  it('deletes a dashboard', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const created = await asMember.mutation(api.dashboards.create, {
      workspaceId,
      name: 'to delete',
      cards: [],
    });

    await asMember.mutation(api.dashboards.remove, { workspaceId, id: created._id });

    const found = await asMember.query(api.dashboards.findById, { workspaceId, id: created._id });
    expect(found).toBeNull();
  });
});
