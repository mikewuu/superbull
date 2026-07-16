/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { assertDefined, makeTestClient, seedWorkspace } from './test-helpers';

describe('workspaces.createWorkspace / listWorkspacesByUser', () => {
  it('creates a workspace with a unique slug and owner membership', async () => {
    const t = makeTestClient();
    const userId = await t.run(async (ctx) => ctx.db.insert('users', { email: 'a@example.com' }));
    const asUser = t.withIdentity({ subject: `${userId}|` });

    const workspace = await asUser.mutation(api.workspaces.createWorkspace, { name: 'Acme Inc' });
    expect(workspace.slug).toBe('acme-inc');

    const another = await asUser.mutation(api.workspaces.createWorkspace, { name: 'Acme Inc' });
    expect(another.slug).toBe('acme-inc-2');

    const memberships = await asUser.query(api.workspaces.listWorkspacesByUser, {});
    expect(memberships).toHaveLength(2);
    expect(memberships.every((m) => m.member.role === 'owner')).toBe(true);
  });

  it('rejects unauthenticated callers', async () => {
    const t = makeTestClient();
    await expect(t.mutation(api.workspaces.createWorkspace, { name: 'x' })).rejects.toThrow();
    await expect(t.query(api.workspaces.listWorkspacesByUser, {})).rejects.toThrow();
  });
});

describe('workspaces.findWorkspaceBySlug', () => {
  it('returns null (not an error) for a non-member — 404-not-403', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const workspace = await t.run(async (ctx) => ctx.db.get(workspaceId));
    const outsider = await seedWorkspace(t);

    const asOutsider = outsider.asMember;
    expect(
      await asOutsider.query(api.workspaces.findWorkspaceBySlug, {
        slug: assertDefined(workspace).slug,
      }),
    ).toBeNull();
    expect(
      await asMember.query(api.workspaces.findWorkspaceBySlug, { slug: 'does-not-exist' }),
    ).toBeNull();

    const found = await asMember.query(api.workspaces.findWorkspaceBySlug, {
      slug: assertDefined(workspace).slug,
    });
    expect(found?.workspace._id).toBe(workspaceId);
  });
});

describe('workspaces.deleteWorkspaceAsOwner', () => {
  it('only the owner can delete, and only with a matching name', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t, { role: 'owner' });
    const admin = await t.run(async (ctx) =>
      ctx.db.insert('users', { email: 'admin@example.com' }),
    );
    await t.run(async (ctx) =>
      ctx.db.insert('members', { workspaceId, userId: admin, role: 'admin' }),
    );
    const asAdmin = t.withIdentity({ subject: `${admin}|` });
    const workspace = await t.run(async (ctx) => ctx.db.get(workspaceId));

    await expect(
      asAdmin.mutation(api.workspaces.deleteWorkspaceAsOwner, {
        workspaceId,
        name: assertDefined(workspace).name,
      }),
    ).rejects.toThrow();

    await expect(
      asMember.mutation(api.workspaces.deleteWorkspaceAsOwner, { workspaceId, name: 'wrong name' }),
    ).rejects.toThrow();

    await asMember.mutation(api.workspaces.deleteWorkspaceAsOwner, {
      workspaceId,
      name: assertDefined(workspace).name,
    });
    expect(await t.run(async (ctx) => ctx.db.get(workspaceId))).toBeNull();
  });
});
