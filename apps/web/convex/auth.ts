import Google from '@auth/core/providers/google';
import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import { convexAuth, createAccount, retrieveAccount } from '@convex-dev/auth/server';
import type { MutationCtx } from './_generated/server';
import { createProjectForUser, projectNameForProfile } from './projects';

const testLoginEmail = 'e2e@superbull.test';

// Dev/e2e-only bypass, since Google OAuth can't be driven headlessly. Only
// registered when the deployment env has AUTH_TEST_LOGIN=true (set on the
// Convex dev deployment used by Playwright, never in production).
const testLoginProvider = ConvexCredentials({
  id: 'test-login',
  authorize: async (_credentials, ctx) => {
    try {
      const { user } = await retrieveAccount(ctx, {
        provider: 'test-login',
        account: { id: testLoginEmail },
      });
      return { userId: user._id };
    } catch {
      const { user } = await createAccount(ctx, {
        provider: 'test-login',
        account: { id: testLoginEmail },
        profile: { email: testLoginEmail, name: 'E2E Test User' },
        shouldLinkViaEmail: false,
      });
      return { userId: user._id };
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, ...(process.env.AUTH_TEST_LOGIN === 'true' ? [testLoginProvider] : [])],
  callbacks: {
    // Open signup: anyone who signs in with Google gets a personal
    // project the first time their account is created. Idempotent by
    // construction — existingUserId is only unset on the very first
    // sign-in for this user.
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, profile }) {
      if (existingUserId) {
        return;
      }

      await createProjectForUser(ctx as MutationCtx, {
        userId,
        name: projectNameForProfile(profile.email, profile.name as string | undefined),
      });
    },
  },
});
