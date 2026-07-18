import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

// Round 2: signup is open (multi-tenant, Google auth). The old
// single-account `canSignUp` gate is gone — every sign-in bootstraps its own
// project, see convex/auth.ts's afterUserCreatedOrUpdated.

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    return user ? { email: user.email ?? null } : null;
  },
});
