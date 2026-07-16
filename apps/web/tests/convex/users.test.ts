/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

// Round 2: signup is open (multi-tenant, Google auth) — the old
// single-account `canSignUp` gate is gone. See convex/auth.ts's
// afterUserCreatedOrUpdated for the personal-workspace bootstrap this
// replaced it with.

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
