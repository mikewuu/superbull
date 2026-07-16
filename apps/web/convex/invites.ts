import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireRole, requireUser, requireWorkspaceMember } from './access';
import { memberRole } from './schema';

const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;

function guardTokenHash(tokenHash: string): void {
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) {
    throw new Error('Invalid token hash');
  }
}

// tokenHash is generated server-side (Next server action, sha256 of a
// random plaintext token) — the plaintext never reaches Convex, mirroring
// how connector enrollment tokens are minted.
export const create = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    email: v.string(),
    role: memberRole,
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireWorkspaceMember(ctx, args.workspaceId);
    requireRole(member, ['owner', 'admin']);
    guardTokenHash(args.tokenHash);

    const email = args.email.trim().toLowerCase();
    if (!email) {
      throw new Error('Email is required');
    }

    const inviteId = await ctx.db.insert('invites', {
      workspaceId: args.workspaceId,
      email,
      role: args.role,
      tokenHash: args.tokenHash,
      invitedBy: userId,
      expiresAt: Date.now() + inviteTtlMs,
    });
    const invite = await ctx.db.get(inviteId);
    if (!invite) {
      throw new Error('failed to create invite');
    }
    return invite;
  },
});

export const listByWorkspace = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query('invites')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();
  },
});

function isLive(invite: { acceptedAt?: number; expiresAt: number }): boolean {
  return !invite.acceptedAt && invite.expiresAt > Date.now();
}

// Unauthenticated by design: the accept page (/invite/[token]) needs to show
// which workspace + role an invite grants before the visitor signs in.
export const findByTokenHash = query({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query('invites')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', args.tokenHash))
      .first();
    if (!invite || !isLive(invite)) {
      return null;
    }
    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) {
      return null;
    }
    return { invite, workspace };
  },
});

export const accept = mutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);
    const invite = await ctx.db
      .query('invites')
      .withIndex('by_token_hash', (q) => q.eq('tokenHash', args.tokenHash))
      .first();
    if (!invite || !isLive(invite)) {
      throw new Error('Invite not found or expired');
    }
    if (user.email && user.email.toLowerCase() !== invite.email) {
      throw new Error('This invite was sent to a different email address');
    }

    const existing = await ctx.db
      .query('members')
      .withIndex('by_workspace_user', (q) =>
        q.eq('workspaceId', invite.workspaceId).eq('userId', userId),
      )
      .first();
    if (!existing) {
      await ctx.db.insert('members', {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      });
    }
    await ctx.db.patch(invite._id, { acceptedAt: Date.now() });

    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    return { workspace };
  },
});

export const revoke = mutation({
  args: { inviteId: v.id('invites') },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      return null;
    }
    const { member } = await requireWorkspaceMember(ctx, invite.workspaceId);
    requireRole(member, ['owner', 'admin']);
    await ctx.db.delete(args.inviteId);
    return null;
  },
});
