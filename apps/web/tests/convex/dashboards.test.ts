/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { makeTestClient, seedProject } from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = 'test-internal-token';
});

const validCard = {
  type: 'throughput' as const,
  connector_id: 'some-connector-id',
  range: '24h' as const,
};

describe('dashboards.create', () => {
  it('creates a dashboard scoped to the project', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);

    const dashboard = await asMember.mutation(api.dashboards.create, {
      projectId,
      name: 'ops overview',
      cards: [validCard],
    });

    expect(dashboard.name).toBe('ops overview');
    expect(dashboard.cards).toEqual([validCard]);
    expect(dashboard.projectId).toBe(projectId);
  });

  it('rejects an invalid card type', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);

    await expect(
      asMember.mutation(api.dashboards.create, {
        projectId,
        name: 'bad',
        cards: [{ ...validCard, type: 'bogus' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('rejects an unauthenticated caller', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);

    await expect(
      t.mutation(api.dashboards.create, { projectId, name: 'x', cards: [] }),
    ).rejects.toThrow();
  });
});

describe('dashboards.list and findById', () => {
  it('lists only this project dashboards', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const other = await seedProject(t);
    await asMember.mutation(api.dashboards.create, { projectId, name: 'a', cards: [] });
    await asMember.mutation(api.dashboards.create, { projectId, name: 'b', cards: [] });
    await other.asMember.mutation(api.dashboards.create, {
      projectId: other.projectId,
      name: 'other project',
      cards: [],
    });

    const dashboards = await asMember.query(api.dashboards.list, { projectId });
    expect(dashboards).toHaveLength(2);
  });

  it('findById returns null for a dashboard in a different project', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const other = await seedProject(t);
    const created = await asMember.mutation(api.dashboards.create, {
      projectId,
      name: 'a',
      cards: [],
    });

    const found = await other.asMember.query(api.dashboards.findById, {
      projectId: other.projectId,
      id: created._id,
    });
    expect(found).toBeNull();
  });
});

describe('dashboards.update', () => {
  it('patches the name only, leaving cards intact', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const created = await asMember.mutation(api.dashboards.create, {
      projectId,
      name: 'old name',
      cards: [validCard],
    });

    const updated = await asMember.mutation(api.dashboards.update, {
      projectId,
      id: created._id,
      name: 'new name',
    });

    expect(updated.name).toBe('new name');
    expect(updated.cards).toEqual([validCard]);
  });

  it('throws for a dashboard in a different project', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const other = await seedProject(t);
    const created = await asMember.mutation(api.dashboards.create, {
      projectId,
      name: 'x',
      cards: [],
    });

    await expect(
      other.asMember.mutation(api.dashboards.update, {
        projectId: other.projectId,
        id: created._id,
        name: 'y',
      }),
    ).rejects.toThrow(/unknown dashboard/);
  });
});

describe('dashboards.remove', () => {
  it('deletes a dashboard', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const created = await asMember.mutation(api.dashboards.create, {
      projectId,
      name: 'to delete',
      cards: [],
    });

    await asMember.mutation(api.dashboards.remove, { projectId, id: created._id });

    const found = await asMember.query(api.dashboards.findById, { projectId, id: created._id });
    expect(found).toBeNull();
  });
});
