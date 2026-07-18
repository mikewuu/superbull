/// <reference types="vite/client" />
import { createHash } from 'node:crypto';
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { hashToken } from '../../src/lib/auth/hash-token';

const internalToken = 'oauth-provider-test-token';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = internalToken;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

describe('OAuth provider', () => {
  it('keeps the user and project binding through refresh rotation and revocation', async () => {
    const t = makeTestClient();
    const { asUser, clientId, projectId } = await seedGrant(t);
    const codeVerifier = 'oauth-verifier-1234567890-abcdefghijklmnopqrstuv';
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');

    await asUser.mutation(api.oauthProvider.createAuthCode, {
      codeHash: hashToken('authorization-code'),
      clientId,
      projectId,
      redirectUri: 'http://[::1]:5200/callback',
      codeChallenge,
    });
    await t.mutation(api.oauthProvider.exchangeCode, {
      codeHash: hashToken('authorization-code'),
      clientId,
      redirectUri: 'http://[::1]:6300/callback',
      computedCodeChallenge: codeChallenge,
      accessTokenHash: hashToken('sbho_first'),
      refreshTokenHash: hashToken('sbhr_first'),
      internalToken,
    });

    await expect(
      t.query(api.apiKeys.findOAuthCaller, { rawToken: 'sbho_first', internalToken }),
    ).resolves.toEqual({ userId: expect.any(String), projectId, scopes: ['mcp'] });

    await t.mutation(api.oauthProvider.refreshTokens, {
      refreshTokenHash: hashToken('sbhr_first'),
      clientId,
      newAccessTokenHash: hashToken('sbho_second'),
      newRefreshTokenHash: hashToken('sbhr_second'),
      internalToken,
    });
    await expect(
      t.query(api.apiKeys.findOAuthCaller, { rawToken: 'sbho_first', internalToken }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.apiKeys.findOAuthCaller, { rawToken: 'sbho_second', internalToken }),
    ).resolves.toEqual({ userId: expect.any(String), projectId, scopes: ['mcp'] });

    await asUser.mutation(api.oauthProvider.disconnectApp, { clientId, projectId });
    await expect(
      t.query(api.apiKeys.findOAuthCaller, { rawToken: 'sbho_second', internalToken }),
    ).resolves.toBeNull();
  });

  it('rejects consent for a project the caller does not belong to', async () => {
    const t = makeTestClient();
    const { asUser, clientId } = await seedGrant(t);
    const foreignProjectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        name: 'Foreign project',
        slug: 'foreign-project',
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(api.oauthProvider.createAuthCode, {
        codeHash: hashToken('foreign-code'),
        clientId,
        projectId: foreignProjectId,
        redirectUri: 'http://[::1]:5200/callback',
        codeChallenge: 'a'.repeat(43),
      }),
    ).rejects.toThrow('Project not found');
  });
});

async function seedGrant(t: ReturnType<typeof makeTestClient>) {
  const { userId, clientId, projectId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', { email: 'oauth@test.dev' });
    const projectId = await ctx.db.insert('projects', {
      name: 'OAuth project',
      slug: 'oauth-project',
      createdAt: Date.now(),
    });
    await ctx.db.insert('members', { userId, projectId, role: 'owner' });
    const clientId = 'sbc_oauth_test';
    await ctx.db.insert('oauthClients', {
      clientId,
      name: 'OAuth test client',
      redirectUris: ['http://[::1]:4100/callback'],
    });
    return { userId, clientId, projectId };
  });
  return { asUser: t.withIdentity({ subject: `${userId}|` }), clientId, projectId };
}
