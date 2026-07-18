import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireInternalToken, requireUserId } from './access';
import { resolveOAuthAccessToken } from './oauthProvider';

const lastUsedTouchIntervalMs = 60_000;

export const insertApiKey = mutation({
  args: { name: v.string(), keyHash: v.string(), keyPrefix: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.replace(/\s+/g, ' ').trim();
    if (!name) {
      throw new ConvexError('Key name is required');
    }
    if (!/^[0-9a-f]{64}$/.test(args.keyHash) || !args.keyPrefix.startsWith('sbh_')) {
      throw new ConvexError('Invalid API key');
    }

    const existingKeys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    if (existingKeys.some((apiKey) => apiKey.name === name)) {
      throw new ConvexError('Key name already exists');
    }

    const existingHash = await ctx.db
      .query('apiKeys')
      .withIndex('by_key_hash', (q) => q.eq('keyHash', args.keyHash))
      .first();
    if (existingHash) {
      throw new ConvexError('Key already exists');
    }

    return await ctx.db.insert('apiKeys', {
      userId,
      name,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
    });
  },
});

export const listApiKeys = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const apiKeys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return apiKeys.map((apiKey) => ({
      _id: apiKey._id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey._creationTime,
      lastUsedAt: apiKey.lastUsedAt ?? null,
      revokedAt: apiKey.revokedAt ?? null,
    }));
  },
});

export const revokeApiKey = mutation({
  args: { apiKeyId: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey || apiKey.userId !== userId) {
      throw new Error('API key not found');
    }
    if (!apiKey.revokedAt) {
      await ctx.db.patch(apiKey._id, { revokedAt: Date.now() });
    }
  },
});

export const findApiKeyCaller = mutation({
  args: { internalToken: v.string(), keyHash: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const apiKey = await ctx.db
      .query('apiKeys')
      .withIndex('by_key_hash', (q) => q.eq('keyHash', args.keyHash))
      .unique();
    if (!apiKey || apiKey.revokedAt) {
      return null;
    }

    const now = Date.now();
    if (!apiKey.lastUsedAt || now - apiKey.lastUsedAt > lastUsedTouchIntervalMs) {
      await ctx.db.patch(apiKey._id, { lastUsedAt: now });
    }
    return { userId: apiKey.userId, projectId: null };
  },
});

export const findOAuthCaller = query({
  args: { internalToken: v.string(), rawToken: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    if (!args.rawToken.startsWith('sbho_')) {
      return null;
    }
    return await resolveOAuthAccessToken(ctx, args.rawToken);
  },
});
