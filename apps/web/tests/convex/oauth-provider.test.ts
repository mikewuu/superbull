/// <reference types="vite/client" />
import { createHash } from 'node:crypto';
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
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

    const caller = await t.query(api.apiKeys.findOAuthCaller, {
      rawToken: 'sbho_first',
      internalToken,
    });
    expect(caller).toEqual({ userId: expect.any(String), projectId, scopes: ['mcp'] });
    if (!caller) {
      throw new Error('Expected OAuth caller');
    }

    const outsideProjectConnectorId = await t.run(async (ctx) => {
      const outsideProjectId = await ctx.db.insert('projects', {
        name: 'Outside project',
        slug: 'outside-project',
        createdAt: Date.now(),
      });
      await ctx.db.insert('members', {
        userId: caller.userId,
        projectId: outsideProjectId,
        role: 'owner',
      });
      return await ctx.db.insert('connectors', {
        projectId: outsideProjectId,
        name: 'outside-connector',
      });
    });
    await expect(
      t.query(api.connectors.findConnectorByIdForUser, {
        internalToken,
        userId: caller.userId,
        connectorId: outsideProjectConnectorId,
        requiredProjectId: caller.projectId,
      }),
    ).resolves.toBeNull();

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

  it('rejects a PKCE mismatch without issuing tokens', async () => {
    const t = makeTestClient();
    const { asUser, clientId, projectId } = await seedGrant(t);
    await asUser.mutation(api.oauthProvider.createAuthCode, {
      codeHash: hashToken('pkce-code'),
      clientId,
      projectId,
      redirectUri: 'http://[::1]:5200/callback',
      codeChallenge: 'correct-challenge',
    });

    const result = await t.mutation(api.oauthProvider.exchangeCode, {
      codeHash: hashToken('pkce-code'),
      clientId,
      redirectUri: 'http://[::1]:6300/callback',
      computedCodeChallenge: 'wrong-challenge',
      accessTokenHash: hashToken('sbho_pkce'),
      refreshTokenHash: hashToken('sbhr_pkce'),
      internalToken,
    });
    const tokens = await t.run(async (ctx) => await ctx.db.query('oauthTokens').collect());

    expect(result).toBeNull();
    expect(tokens).toHaveLength(0);
  });

  it('revokes the grant family when an authorization code is reused', async () => {
    const t = makeTestClient();
    const { asUser, clientId, projectId } = await seedGrant(t);
    await asUser.mutation(api.oauthProvider.createAuthCode, {
      codeHash: hashToken('reused-code'),
      clientId,
      projectId,
      redirectUri: 'http://[::1]:5200/callback',
      codeChallenge: 'matching-challenge',
    });
    const exchangeArgs = {
      codeHash: hashToken('reused-code'),
      clientId,
      redirectUri: 'http://[::1]:6300/callback',
      computedCodeChallenge: 'matching-challenge',
      accessTokenHash: hashToken('sbho_code_reuse'),
      refreshTokenHash: hashToken('sbhr_code_reuse'),
      internalToken,
    };
    await t.mutation(api.oauthProvider.exchangeCode, exchangeArgs);

    await expect(t.mutation(api.oauthProvider.exchangeCode, exchangeArgs)).resolves.toBeNull();
    await expect(
      t.query(api.apiKeys.findOAuthCaller, { rawToken: 'sbho_code_reuse', internalToken }),
    ).resolves.toBeNull();
  });

  it('revokes the rotated grant family when a refresh token is reused', async () => {
    const t = makeTestClient();
    const { clientId, projectId, userId } = await seedGrant(t);
    await insertToken(t, {
      accessToken: 'sbho_refresh_first',
      refreshToken: 'sbhr_refresh_first',
      clientId,
      projectId,
      userId,
    });
    const refreshArgs = {
      refreshTokenHash: hashToken('sbhr_refresh_first'),
      clientId,
      newAccessTokenHash: hashToken('sbho_refresh_second'),
      newRefreshTokenHash: hashToken('sbhr_refresh_second'),
      internalToken,
    };
    await t.mutation(api.oauthProvider.refreshTokens, refreshArgs);

    await expect(t.mutation(api.oauthProvider.refreshTokens, refreshArgs)).resolves.toBeNull();
    await expect(
      t.query(api.apiKeys.findOAuthCaller, { rawToken: 'sbho_refresh_second', internalToken }),
    ).resolves.toBeNull();
  });

  it('rejects expired tokens and deletes expired or revoked OAuth records', async () => {
    const t = makeTestClient();
    const { clientId, projectId, userId } = await seedGrant(t);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert('oauthAuthCodes', {
        codeHash: hashToken('expired-code'),
        clientId,
        userId,
        projectId,
        redirectUri: 'http://[::1]:5200/callback',
        codeChallenge: 'expired-challenge',
        scopes: ['mcp'],
        expiresAt: now - 1,
      });
      await ctx.db.insert('oauthTokens', {
        accessTokenHash: hashToken('sbho_expired'),
        refreshTokenHash: hashToken('sbhr_expired'),
        userId,
        projectId,
        clientId,
        scopes: ['mcp'],
        expiresAt: now - 1,
        refreshExpiresAt: now - 1,
      });
      await ctx.db.insert('oauthTokens', {
        accessTokenHash: hashToken('sbho_revoked'),
        refreshTokenHash: hashToken('sbhr_revoked'),
        userId,
        projectId,
        clientId,
        scopes: ['mcp'],
        expiresAt: now + 60_000,
        refreshExpiresAt: now + 60_000,
        revokedAt: now,
      });
    });

    await expect(
      t.query(api.apiKeys.findOAuthCaller, { rawToken: 'sbho_expired', internalToken }),
    ).resolves.toBeNull();
    await expect(
      t.mutation(api.oauthProvider.exchangeCode, {
        codeHash: hashToken('expired-code'),
        clientId,
        redirectUri: 'http://[::1]:5200/callback',
        computedCodeChallenge: 'expired-challenge',
        accessTokenHash: hashToken('sbho_after_expired_code'),
        refreshTokenHash: hashToken('sbhr_after_expired_code'),
        internalToken,
      }),
    ).resolves.toBeNull();
    await expect(
      t.mutation(api.oauthProvider.refreshTokens, {
        refreshTokenHash: hashToken('sbhr_expired'),
        clientId,
        newAccessTokenHash: hashToken('sbho_after_expiry'),
        newRefreshTokenHash: hashToken('sbhr_after_expiry'),
        internalToken,
      }),
    ).resolves.toBeNull();
    await expect(
      t.mutation(api.oauthProvider.cleanupExpiredOAuth, { internalToken }),
    ).resolves.toEqual({ deletedAuthCodeCount: 1, deletedTokenCount: 2 });
    const remainingRecords = await t.run(async (ctx) => ({
      authCodes: await ctx.db.query('oauthAuthCodes').collect(),
      tokens: await ctx.db.query('oauthTokens').collect(),
    }));
    expect(remainingRecords).toEqual({ authCodes: [], tokens: [] });
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
  return { asUser: t.withIdentity({ subject: `${userId}|` }), clientId, projectId, userId };
}

async function insertToken(
  t: ReturnType<typeof makeTestClient>,
  args: {
    accessToken: string;
    refreshToken: string;
    clientId: string;
    projectId: Id<'projects'>;
    userId: Id<'users'>;
  },
) {
  await t.run(async (ctx) => {
    await ctx.db.insert('oauthTokens', {
      accessTokenHash: hashToken(args.accessToken),
      refreshTokenHash: hashToken(args.refreshToken),
      userId: args.userId,
      projectId: args.projectId,
      clientId: args.clientId,
      scopes: ['mcp'],
      expiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() + 60_000,
    });
  });
}
