/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { beforeEach, describe, expect, it } from 'vitest';
import schema from '../../convex/schema';

const INTERNAL_TOKEN = 'test-internal-token';

const createSourceRef = makeFunctionReference<'mutation'>('proxySources:create');
const createRef = makeFunctionReference<'mutation'>('deployAnnotations:create');
const listRef = makeFunctionReference<'query'>('deployAnnotations:list');
const removeRef = makeFunctionReference<'mutation'>('deployAnnotations:remove');

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

async function createSource(t: ReturnType<typeof makeTestClient>) {
  return await t.mutation(createSourceRef, {
    internalToken: INTERNAL_TOKEN,
    name: 'proxy-a',
    url: 'https://proxy-a.example.com',
    token: 'secret',
  });
}

describe('deployAnnotations', () => {
  it('creates an annotation and returns the full object', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    const created = await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'v1.2.3',
      ts: 1000,
    });

    expect(created).toMatchObject({ sourceId: source._id, label: 'v1.2.3', ts: 1000 });
  });

  it('create throws for an unknown source', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(createRef, {
        internalToken: INTERNAL_TOKEN,
        sourceId: 'not-a-real-id',
        label: 'v1.2.3',
        ts: 1000,
      }),
    ).rejects.toThrow(/unknown source/);
  });

  it('list returns annotations for a source ordered most-recent-first', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'v1',
      ts: 100,
    });
    await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'v2',
      ts: 200,
    });

    const all = await t.query(listRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(all.map((a: { label: string }) => a.label)).toEqual(['v2', 'v1']);
  });

  it('list filters by a fromTs/toTs range', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'too-early',
      ts: 50,
    });
    await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'in-range',
      ts: 150,
    });
    await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'too-late',
      ts: 500,
    });

    const inRange = await t.query(listRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      fromTs: 100,
      toTs: 200,
    });
    expect(inRange).toHaveLength(1);
    expect(inRange[0]).toMatchObject({ label: 'in-range' });
  });

  it('list respects an open-ended fromTs and an open-ended toTs', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'early',
      ts: 50,
    });
    await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'late',
      ts: 500,
    });

    const fromOnly = await t.query(listRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      fromTs: 100,
    });
    const toOnly = await t.query(listRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      toTs: 100,
    });
    expect(fromOnly.map((a: { label: string }) => a.label)).toEqual(['late']);
    expect(toOnly.map((a: { label: string }) => a.label)).toEqual(['early']);
  });

  it('remove deletes the annotation', async () => {
    const t = makeTestClient();
    const source = await createSource(t);
    const created = await t.mutation(createRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      label: 'v1',
      ts: 100,
    });

    await t.mutation(removeRef, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });

    const all = await t.query(listRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(all).toHaveLength(0);
  });

  it('throws with the wrong internal token on every function', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await expect(
      t.mutation(createRef, {
        internalToken: 'wrong-token',
        sourceId: source._id,
        label: 'v1',
        ts: 100,
      }),
    ).rejects.toThrow();
    await expect(
      t.query(listRef, {
        internalToken: 'wrong-token',
        sourceId: source._id,
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(removeRef, {
        internalToken: 'wrong-token',
        id: source._id,
      }),
    ).rejects.toThrow();
  });
});
