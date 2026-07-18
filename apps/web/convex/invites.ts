import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireProjectMember, requireRole, requireUser } from './access';
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
    projectId: v.id('projects'),
    email: v.string(),
    role: memberRole,
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, member } = await requireProjectMember(ctx, args.projectId);
    requireRole(member, ['owner', 'admin']);
    guardTokenHash(args.tokenHash);

    const email = args.email.trim().toLowerCase();
    if (!email) {
      throw new Error('Email is required');
    }

    const inviteId = await ctx.db.insert('invites', {
      projectId: args.projectId,
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

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    return await ctx.db
      .query('invites')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

function isLive(invite: { acceptedAt?: number; expiresAt: number }): boolean {
  return !invite.acceptedAt && invite.expiresAt > Date.now();
}

// Unauthenticated by design: the accept page (/invite/[token]) needs to show
// which project + role an invite grants before the visitor signs in.
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
    const project = await ctx.db.get(invite.projectId);
    if (!project) {
      return null;
    }
    return { invite, project };
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
      .withIndex('by_project_user', (q) => q.eq('projectId', invite.projectId).eq('userId', userId))
      .first();
    if (!existing) {
      await ctx.db.insert('members', {
        projectId: invite.projectId,
        userId,
        role: invite.role,
      });
    }
    await ctx.db.patch(invite._id, { acceptedAt: Date.now() });

    const project = await ctx.db.get(invite.projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    return { project };
  },
});

export const revoke = mutation({
  args: { inviteId: v.id('invites') },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      return null;
    }
    const { member } = await requireProjectMember(ctx, invite.projectId);
    requireRole(member, ['owner', 'admin']);
    await ctx.db.delete(args.inviteId);
    return null;
  },
});
