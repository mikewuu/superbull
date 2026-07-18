import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { requireInternalToken, requireProjectMember, requireUser, requireUserId } from './access';

const authCodeTtlMs = 10 * 60 * 1000;
const accessTokenTtlMs = 60 * 60 * 1000;
const refreshTokenTtlMs = 90 * 24 * 60 * 60 * 1000;
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export async function resolveOAuthAccessToken(ctx: QueryCtx, rawToken: string) {
  const accessTokenHash = await hashToken(rawToken);
  const token = await ctx.db
    .query('oauthTokens')
    .withIndex('by_access_token_hash', (queryBuilder) =>
      queryBuilder.eq('accessTokenHash', accessTokenHash),
    )
    .unique();

  if (!token || token.revokedAt || token.expiresAt <= Date.now()) {
    return null;
  }

  return { userId: token.userId, projectId: token.projectId, scopes: token.scopes };
}

export const registerClient = mutation({
  args: {
    clientId: v.string(),
    name: v.string(),
    redirectUris: v.array(v.string()),
    internalToken: v.string(),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    await ctx.db.insert('oauthClients', {
      clientId: args.clientId,
      name: args.name,
      redirectUris: args.redirectUris,
    });
  },
});

export const getClient = query({
  args: { clientId: v.string(), internalToken: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const client = await findClient(ctx, args.clientId);
    if (!client) {
      return null;
    }

    return {
      clientId: client.clientId,
      name: client.name,
      redirectUris: client.redirectUris,
    };
  },
});

export const createAuthCode = mutation({
  args: {
    codeHash: v.string(),
    clientId: v.string(),
    projectId: v.id('projects'),
    redirectUri: v.string(),
    codeChallenge: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectMember(ctx, args.projectId);
    const client = await findClient(ctx, args.clientId);
    if (!client || !isRedirectUriRegistered(client.redirectUris, args.redirectUri)) {
      throw new ConvexError('Invalid client or redirect_uri');
    }

    await ctx.db.insert('oauthAuthCodes', {
      codeHash: args.codeHash,
      clientId: args.clientId,
      userId,
      projectId: args.projectId,
      redirectUri: args.redirectUri,
      codeChallenge: args.codeChallenge,
      scopes: ['mcp'],
      expiresAt: Date.now() + authCodeTtlMs,
    });
  },
});

export const exchangeCode = mutation({
  args: {
    codeHash: v.string(),
    clientId: v.string(),
    redirectUri: v.string(),
    computedCodeChallenge: v.string(),
    accessTokenHash: v.string(),
    refreshTokenHash: v.string(),
    internalToken: v.string(),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const code = await ctx.db
      .query('oauthAuthCodes')
      .withIndex('by_code_hash', (queryBuilder) => queryBuilder.eq('codeHash', args.codeHash))
      .unique();
    if (code?.usedAt) {
      await revokeGrantFamily(ctx, code);
      return null;
    }
    if (!isValidAuthCode(code, args)) {
      return null;
    }

    await ctx.db.patch(code._id, { usedAt: Date.now() });
    await insertTokens(ctx, {
      accessTokenHash: args.accessTokenHash,
      refreshTokenHash: args.refreshTokenHash,
      userId: code.userId,
      projectId: code.projectId,
      clientId: code.clientId,
      scopes: code.scopes,
    });
    return { expiresInSeconds: Math.floor(accessTokenTtlMs / 1000) };
  },
});

export const refreshTokens = mutation({
  args: {
    refreshTokenHash: v.string(),
    clientId: v.string(),
    newAccessTokenHash: v.string(),
    newRefreshTokenHash: v.string(),
    internalToken: v.string(),
  },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const token = await ctx.db
      .query('oauthTokens')
      .withIndex('by_refresh_token_hash', (queryBuilder) =>
        queryBuilder.eq('refreshTokenHash', args.refreshTokenHash),
      )
      .unique();
    if (token?.revokedAt) {
      await revokeGrantFamily(ctx, token);
      return null;
    }
    if (!isValidRefreshToken(token, args.clientId)) {
      return null;
    }

    await ctx.db.patch(token._id, { revokedAt: Date.now() });
    await insertTokens(ctx, {
      accessTokenHash: args.newAccessTokenHash,
      refreshTokenHash: args.newRefreshTokenHash,
      userId: token.userId,
      projectId: token.projectId,
      clientId: token.clientId,
      scopes: token.scopes,
    });
    return { expiresInSeconds: Math.floor(accessTokenTtlMs / 1000) };
  },
});

export const revokeToken = mutation({
  args: { tokenHash: v.string(), clientId: v.string(), internalToken: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const accessToken = await ctx.db
      .query('oauthTokens')
      .withIndex('by_access_token_hash', (queryBuilder) =>
        queryBuilder.eq('accessTokenHash', args.tokenHash),
      )
      .unique();
    const token =
      accessToken ??
      (await ctx.db
        .query('oauthTokens')
        .withIndex('by_refresh_token_hash', (queryBuilder) =>
          queryBuilder.eq('refreshTokenHash', args.tokenHash),
        )
        .unique());
    if (token && token.clientId === args.clientId && !token.revokedAt) {
      await ctx.db.patch(token._id, { revokedAt: Date.now() });
    }
  },
});

export const getCurrentUserForAuthorize = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    return { email: user.email ?? null };
  },
});

export const listConnectedApps = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const tokens = await ctx.db
      .query('oauthTokens')
      .withIndex('by_user', (queryBuilder) => queryBuilder.eq('userId', userId))
      .collect();
    const grants = getConnectedGrants(tokens);
    const apps = [];
    for (const grant of grants.values()) {
      const client = await findClient(ctx, grant.clientId);
      const project = await ctx.db.get(grant.projectId);
      apps.push({
        clientId: grant.clientId,
        clientName: client?.name ?? 'Unknown app',
        projectId: grant.projectId,
        projectName: project?.name ?? 'Unknown project',
        connectedAt: grant.connectedAt,
      });
    }
    return apps.sort((first, second) => second.connectedAt - first.connectedAt);
  },
});

export const disconnectApp = mutation({
  args: { clientId: v.string(), projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tokens = await ctx.db
      .query('oauthTokens')
      .withIndex('by_user', (queryBuilder) => queryBuilder.eq('userId', userId))
      .collect();
    const matchingTokens = tokens.filter(
      (token) =>
        token.clientId === args.clientId && token.projectId === args.projectId && !token.revokedAt,
    );
    const revokedAt = Date.now();
    await Promise.all(matchingTokens.map((token) => ctx.db.patch(token._id, { revokedAt })));
  },
});

export const cleanupExpiredOAuth = mutation({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const now = Date.now();
    const [authCodes, tokens] = await Promise.all([
      ctx.db.query('oauthAuthCodes').collect(),
      ctx.db.query('oauthTokens').collect(),
    ]);
    const expiredAuthCodes = authCodes.filter((authCode) => authCode.expiresAt <= now);
    const expiredTokens = tokens.filter(
      (token) => Boolean(token.revokedAt) || token.refreshExpiresAt <= now,
    );
    await Promise.all(
      [...expiredAuthCodes, ...expiredTokens].map((record) => ctx.db.delete(record._id)),
    );
    return {
      deletedAuthCodeCount: expiredAuthCodes.length,
      deletedTokenCount: expiredTokens.length,
    };
  },
});

async function hashToken(rawToken: string): Promise<string> {
  const bytes = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function findClient(ctx: QueryCtx | MutationCtx, clientId: string) {
  return await ctx.db
    .query('oauthClients')
    .withIndex('by_client_id', (queryBuilder) => queryBuilder.eq('clientId', clientId))
    .unique();
}

function isRedirectUriRegistered(
  registeredRedirectUris: string[],
  presentedRedirectUri: string,
): boolean {
  return registeredRedirectUris.some((registeredRedirectUri) =>
    redirectUriMatches(registeredRedirectUri, presentedRedirectUri),
  );
}

function redirectUriMatches(firstRedirectUri: string, secondRedirectUri: string): boolean {
  if (firstRedirectUri === secondRedirectUri) {
    return true;
  }

  let firstUrl: URL;
  let secondUrl: URL;
  try {
    firstUrl = new URL(firstRedirectUri);
    secondUrl = new URL(secondRedirectUri);
  } catch {
    return false;
  }

  if (!isLoopbackHttp(firstUrl) || !isLoopbackHttp(secondUrl)) {
    return false;
  }

  return firstUrl.hostname === secondUrl.hostname && firstUrl.pathname === secondUrl.pathname;
}

function isLoopbackHttp(url: URL): boolean {
  return url.protocol === 'http:' && loopbackHosts.has(url.hostname);
}

function isValidAuthCode(
  code: Doc<'oauthAuthCodes'> | null,
  args: {
    clientId: string;
    redirectUri: string;
    computedCodeChallenge: string;
  },
): code is Doc<'oauthAuthCodes'> {
  if (!code) {
    return false;
  }
  return Boolean(
    !code.usedAt &&
      code.expiresAt >= Date.now() &&
      code.clientId === args.clientId &&
      redirectUriMatches(code.redirectUri, args.redirectUri) &&
      code.codeChallenge === args.computedCodeChallenge,
  );
}

function isValidRefreshToken(
  token: Doc<'oauthTokens'> | null,
  clientId: string,
): token is Doc<'oauthTokens'> {
  if (!token) {
    return false;
  }
  return !token.revokedAt && token.refreshExpiresAt >= Date.now() && token.clientId === clientId;
}

async function insertTokens(
  ctx: MutationCtx,
  args: {
    accessTokenHash: string;
    refreshTokenHash: string;
    userId: Id<'users'>;
    projectId: Id<'projects'>;
    clientId: string;
    scopes: string[];
  },
): Promise<void> {
  const now = Date.now();
  await ctx.db.insert('oauthTokens', {
    accessTokenHash: args.accessTokenHash,
    refreshTokenHash: args.refreshTokenHash,
    userId: args.userId,
    projectId: args.projectId,
    clientId: args.clientId,
    scopes: args.scopes,
    expiresAt: now + accessTokenTtlMs,
    refreshExpiresAt: now + refreshTokenTtlMs,
  });
}

async function revokeGrantFamily(
  ctx: MutationCtx,
  grant: { clientId: string; userId: Id<'users'>; projectId: Id<'projects'> },
): Promise<void> {
  const userTokens = await ctx.db
    .query('oauthTokens')
    .withIndex('by_user', (queryBuilder) => queryBuilder.eq('userId', grant.userId))
    .collect();
  const activeGrantTokens = userTokens.filter(
    (token) =>
      token.clientId === grant.clientId && token.projectId === grant.projectId && !token.revokedAt,
  );
  const revokedAt = Date.now();
  await Promise.all(activeGrantTokens.map((token) => ctx.db.patch(token._id, { revokedAt })));
}

function getConnectedGrants(
  tokens: Array<{
    _creationTime: number;
    clientId: string;
    projectId: Id<'projects'>;
    refreshExpiresAt: number;
    revokedAt?: number;
  }>,
): Map<string, { clientId: string; projectId: Id<'projects'>; connectedAt: number }> {
  const now = Date.now();
  const grantsById = new Map<
    string,
    { clientId: string; projectId: Id<'projects'>; connectedAt: number; hasActiveToken: boolean }
  >();
  for (const token of tokens) {
    const grantId = `${token.clientId}:${token.projectId}`;
    const existingGrant = grantsById.get(grantId);
    const hasActiveToken = !token.revokedAt && token.refreshExpiresAt > now;
    if (!existingGrant) {
      grantsById.set(grantId, {
        clientId: token.clientId,
        projectId: token.projectId,
        connectedAt: token._creationTime,
        hasActiveToken,
      });
      continue;
    }

    grantsById.set(grantId, {
      ...existingGrant,
      connectedAt: Math.min(existingGrant.connectedAt, token._creationTime),
      hasActiveToken: existingGrant.hasActiveToken || hasActiveToken,
    });
  }

  const connectedGrants = new Map<
    string,
    { clientId: string; projectId: Id<'projects'>; connectedAt: number }
  >();
  for (const [grantId, grant] of grantsById) {
    if (!grant.hasActiveToken) {
      continue;
    }
    connectedGrants.set(grantId, {
      clientId: grant.clientId,
      projectId: grant.projectId,
      connectedAt: grant.connectedAt,
    });
  }
  return connectedGrants;
}
