import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from './_generated/server';

export const canSignUp = query({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('users').first();
    return existing === null;
  },
});

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
