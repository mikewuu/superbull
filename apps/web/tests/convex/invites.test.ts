/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { assertDefined, makeTestClient, seedProject } from './test-helpers';

const TOKEN_HASH = 'd'.repeat(64);

describe('invites.create', () => {
  it('owner/admin can invite; a plain member cannot', async () => {
    const t = makeTestClient();
    const { projectId, asMember: asOwner } = await seedProject(t, { role: 'owner' });
    const { asMember: asPlainMember } = await (async () => {
      const userId = await t.run(async (ctx) =>
        ctx.db.insert('users', { email: 'member@example.com' }),
      );
      await t.run(async (ctx) => ctx.db.insert('members', { projectId, userId, role: 'member' }));
      return { asMember: t.withIdentity({ subject: `${userId}|` }) };
    })();

    const invite = await asOwner.mutation(api.invites.create, {
      projectId,
      email: 'friend@example.com',
      role: 'member',
      tokenHash: TOKEN_HASH,
    });
    expect(invite.email).toBe('friend@example.com');

    await expect(
      asPlainMember.mutation(api.invites.create, {
        projectId,
        email: 'someone-else@example.com',
        role: 'member',
        tokenHash: 'e'.repeat(64),
      }),
    ).rejects.toThrow();
  });
});

describe('invites.accept', () => {
  it('adds the accepting user as a member with the invite role', async () => {
    const t = makeTestClient();
    const { projectId, asMember: asOwner } = await seedProject(t, { role: 'owner' });
    await asOwner.mutation(api.invites.create, {
      projectId,
      email: 'newperson@example.com',
      role: 'admin',
      tokenHash: TOKEN_HASH,
    });

    const newUserId = await t.run(async (ctx) =>
      ctx.db.insert('users', { email: 'newperson@example.com' }),
    );
    const asNewUser = t.withIdentity({ subject: `${newUserId}|` });

    const result = await asNewUser.mutation(api.invites.accept, { tokenHash: TOKEN_HASH });
    expect(result.project._id).toBe(projectId);

    const member = await t.run(async (ctx) =>
      ctx.db
        .query('members')
        .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', newUserId))
        .first(),
    );
    expect(member?.role).toBe('admin');
  });

  it('rejects an invite accepted by a different email', async () => {
    const t = makeTestClient();
    const { projectId, asMember: asOwner } = await seedProject(t, { role: 'owner' });
    await asOwner.mutation(api.invites.create, {
      projectId,
      email: 'expected@example.com',
      role: 'member',
      tokenHash: TOKEN_HASH,
    });

    const otherUserId = await t.run(async (ctx) =>
      ctx.db.insert('users', { email: 'someone-else@example.com' }),
    );
    const asOtherUser = t.withIdentity({ subject: `${otherUserId}|` });

    await expect(
      asOtherUser.mutation(api.invites.accept, { tokenHash: TOKEN_HASH }),
    ).rejects.toThrow();
  });

  it('rejects an expired invite', async () => {
    const t = makeTestClient();
    const { projectId, asMember: asOwner } = await seedProject(t, { role: 'owner' });
    await asOwner.mutation(api.invites.create, {
      projectId,
      email: 'late@example.com',
      role: 'member',
      tokenHash: TOKEN_HASH,
    });
    await t.run(async (ctx) => {
      const invite = await ctx.db
        .query('invites')
        .withIndex('by_token_hash', (q) => q.eq('tokenHash', TOKEN_HASH))
        .unique();
      await ctx.db.patch(assertDefined(invite)._id, { expiresAt: Date.now() - 1000 });
    });

    const userId = await t.run(async (ctx) =>
      ctx.db.insert('users', { email: 'late@example.com' }),
    );
    const asUser = t.withIdentity({ subject: `${userId}|` });

    await expect(asUser.mutation(api.invites.accept, { tokenHash: TOKEN_HASH })).rejects.toThrow();
  });
});
