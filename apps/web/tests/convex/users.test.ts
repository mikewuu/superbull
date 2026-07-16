/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

describe('users.canSignUp', () => {
  it('allows sign-up when no user exists yet', async () => {
    const t = makeTestClient();

    expect(await t.query(api.users.canSignUp, {})).toBe(true);
  });

  it('blocks sign-up once a first user exists', async () => {
    const t = makeTestClient();

    await t.run(async (ctx) => {
      await ctx.db.insert('users', { email: 'first@example.com' });
    });

    expect(await t.query(api.users.canSignUp, {})).toBe(false);
  });
});

describe('users.viewer', () => {
  it('returns null when unauthenticated', async () => {
    const t = makeTestClient();

    expect(await t.query(api.users.viewer, {})).toBeNull();
  });

  it('returns the signed-in user email', async () => {
    const t = makeTestClient();

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', { email: 'viewer@example.com' });
    });

    const asUser = t.withIdentity({ subject: `${userId}|` });
    expect(await asUser.query(api.users.viewer, {})).toEqual({ email: 'viewer@example.com' });
  });
});
