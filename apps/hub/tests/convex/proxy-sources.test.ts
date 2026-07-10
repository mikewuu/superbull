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

describe('proxySources', () => {
  it('creates a source and lists it back', async () => {
    const t = makeTestClient();

    const created = await t.mutation(api.proxySources.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });
    const sources = await t.query(api.proxySources.list, { internalToken: INTERNAL_TOKEN });

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ _id: created._id, name: 'proxy-a' });
  });

  it('findById returns null for an invalid-format id', async () => {
    const t = makeTestClient();

    const found = await t.query(api.proxySources.findById, {
      internalToken: INTERNAL_TOKEN,
      id: 'not-a-real-id',
    });

    expect(found).toBeNull();
  });

  it('findById returns null for an unknown but well-formed id', async () => {
    const t = makeTestClient();

    const created = await t.mutation(api.proxySources.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });
    await t.mutation(api.proxySources.remove, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });

    const found = await t.query(api.proxySources.findById, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });

    expect(found).toBeNull();
  });

  it('findById returns the matching source', async () => {
    const t = makeTestClient();

    const created = await t.mutation(api.proxySources.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });

    const found = await t.query(api.proxySources.findById, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });

    expect(found).toMatchObject({ _id: created._id, name: 'proxy-a' });
  });

  it('remove deletes the source', async () => {
    const t = makeTestClient();

    const created = await t.mutation(api.proxySources.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });
    await t.mutation(api.proxySources.remove, {
      internalToken: INTERNAL_TOKEN,
      id: created._id,
    });

    const sources = await t.query(api.proxySources.list, { internalToken: INTERNAL_TOKEN });
    expect(sources).toHaveLength(0);
  });

  it('list throws with the wrong internal token', async () => {
    const t = makeTestClient();

    await expect(
      t.query(api.proxySources.list, { internalToken: 'wrong-token' }),
    ).rejects.toThrow();
  });

  it('findById throws with the wrong internal token', async () => {
    const t = makeTestClient();

    await expect(
      t.query(api.proxySources.findById, { internalToken: 'wrong-token', id: 'not-a-real-id' }),
    ).rejects.toThrow();
  });

  it('create throws with the wrong internal token', async () => {
    const t = makeTestClient();

    await expect(
      t.mutation(api.proxySources.create, {
        internalToken: 'wrong-token',
        name: 'proxy-a',
        url: 'https://proxy-a.example.com',
        token: 'secret',
      }),
    ).rejects.toThrow();
  });

  it('remove throws with the wrong internal token', async () => {
    const t = makeTestClient();

    const created = await t.mutation(api.proxySources.create, {
      internalToken: INTERNAL_TOKEN,
      name: 'proxy-a',
      url: 'https://proxy-a.example.com',
      token: 'secret',
    });

    await expect(
      t.mutation(api.proxySources.remove, { internalToken: 'wrong-token', id: created._id }),
    ).rejects.toThrow();
  });
});
