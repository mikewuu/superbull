import { ConvexCredentials } from '@convex-dev/auth/providers/ConvexCredentials';
import { convexAuth, createAccount, retrieveAccount } from '@convex-dev/auth/server';
import { Scrypt } from 'lucia';
import { api } from './_generated/api';

// Self-hosted ops tool: the first sign-up bootstraps the only account this
// deployment needs; every sign-up after that is rejected here so there's no
// open registration surface. Invites are out of scope — an operator who
// needs another seat asks an existing user, who creates the account for them
// (no in-app flow for that yet).
const password = ConvexCredentials({
  id: 'password',
  crypto: {
    hashSecret: (secret) => new Scrypt().hash(secret),
    verifySecret: (secret, hash) => new Scrypt().verify(hash, secret),
  },
  authorize: async (params, ctx) => {
    const flow = params.flow as string;
    const email = params.email as string;
    const secret = params.password as string;

    if (flow === 'signUp') {
      if (!secret || secret.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }
      const canSignUp = await ctx.runQuery(api.users.canSignUp, {});
      if (!canSignUp) {
        throw new Error('Ask an existing user to invite you.');
      }
      const { user } = await createAccount(ctx, {
        provider: 'password',
        account: { id: email, secret },
        profile: { email },
      });
      return { userId: user._id };
    }

    if (flow === 'signIn') {
      if (!secret) {
        throw new Error('Missing password.');
      }
      const { user } = await retrieveAccount(ctx, {
        provider: 'password',
        account: { id: email, secret },
      });
      return { userId: user._id };
    }

    throw new Error(`Unsupported auth flow: ${flow}`);
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [password],
});
