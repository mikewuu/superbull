/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';

const INTERNAL_TOKEN = 'test-internal-token';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

const validCard = {
  type: 'throughput' as const,
  source_id: 'some-source-id',
  range: '24h' as const,
};

describe('dashboards.create', () => {
  it('creates a dashboard with the given name and cards', async () => {
    const t = makeTestClient();

    const dashboard = await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'ops overview',
      cards: [validCard],
    });

    expect(dashboard.name).toBe('ops overview');
    expect(dashboard.cards).toEqual([validCard]);
  });

  it('rejects an invalid card type', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.dashboards.create, {
        internalToken: INTERNAL_TOKEN,
        name: 'bad',
        cards: [{ ...validCard, type: 'bogus' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('rejects an invalid range', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.dashboards.create, {
        internalToken: INTERNAL_TOKEN,
        name: 'bad',
        cards: [{ ...validCard, range: '1h' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('throws with the wrong internal token', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.dashboards.create, { internalToken: 'wrong', name: 'x', cards: [] }),
    ).rejects.toThrow();
  });
});

describe('dashboards.list and findById', () => {
  it('lists all created dashboards', async () => {
    const t = makeTestClient();
    await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'a',
      cards: [],
    });
    await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'b',
      cards: [],
    });

    const dashboards = await t.query(api.dashboards.list, { internalToken: INTERNAL_TOKEN });

    expect(dashboards).toHaveLength(2);
  });

  it('finds a dashboard by id', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'a',
      cards: [],
    });

    const found = await t.query(api.dashboards.findById, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });

    expect(found?.name).toBe('a');
  });

  it('returns null for an unknown dashboard id', async () => {
    const t = makeTestClient();

    const found = await t.query(api.dashboards.findById, {
      internalToken: INTERNAL_TOKEN,
      id: 'not-a-real-id',
    });

    expect(found).toBeNull();
  });
});

describe('dashboards.update', () => {
  it('patches the name only, leaving cards intact', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'old name',
      cards: [validCard],
    });

    const updated = await t.mutation(api.dashboards.update, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
      name: 'new name',
    });

    expect(updated.name).toBe('new name');
    expect(updated.cards).toEqual([validCard]);
  });

  it('patches cards only, leaving name intact', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'keep me',
      cards: [],
    });

    const updated = await t.mutation(api.dashboards.update, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
      cards: [validCard],
    });

    expect(updated.name).toBe('keep me');
    expect(updated.cards).toEqual([validCard]);
  });

  it('rejects an invalid card shape on update', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'x',
      cards: [],
    });

    await expect(
      t.mutation(api.dashboards.update, {
        internalToken: INTERNAL_TOKEN,
        id: created._id,
        cards: [{ type: 'throughput', source_id: 'x' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('throws for an unknown dashboard', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.dashboards.update, {
        internalToken: INTERNAL_TOKEN,
        id: 'not-a-real-id',
        name: 'x',
      }),
    ).rejects.toThrow(/unknown dashboard/);
  });
});

describe('dashboards.remove', () => {
  it('deletes a dashboard', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'to delete',
      cards: [],
    });

    await t.mutation(api.dashboards.remove, { internalToken: INTERNAL_TOKEN, id: created._id });

    const found = await t.query(api.dashboards.findById, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });
    expect(found).toBeNull();
  });

  it('throws with the wrong internal token', async () => {
    const t = makeTestClient();
    const created = await t.mutation(api.dashboards.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'x',
      cards: [],
    });

    await expect(
      t.mutation(api.dashboards.remove, { internalToken: 'wrong', id: created._id }),
    ).rejects.toThrow();
  });
});
