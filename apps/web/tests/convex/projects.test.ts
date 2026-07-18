/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import { assertDefined, makeTestClient, seedProject } from './test-helpers';

describe('projects.createProject / listProjectsByUser', () => {
  it('creates a project with a unique slug and owner membership', async () => {
    const t = makeTestClient();
    const userId = await t.run(async (ctx) => ctx.db.insert('users', { email: 'a@example.com' }));
    const asUser = t.withIdentity({ subject: `${userId}|` });

    const project = await asUser.mutation(api.projects.createProject, { name: 'Acme Inc' });
    expect(project.slug).toBe('acme-inc');

    const another = await asUser.mutation(api.projects.createProject, { name: 'Acme Inc' });
    expect(another.slug).toBe('acme-inc-2');

    const memberships = await asUser.query(api.projects.listProjectsByUser, {});
    expect(memberships).toHaveLength(2);
    expect(memberships.every((m) => m.member.role === 'owner')).toBe(true);
  });

  it('rejects unauthenticated callers', async () => {
    const t = makeTestClient();
    await expect(t.mutation(api.projects.createProject, { name: 'x' })).rejects.toThrow();
    await expect(t.query(api.projects.listProjectsByUser, {})).rejects.toThrow();
  });
});

describe('projects.findProjectBySlug', () => {
  it('returns null (not an error) for a non-member — 404-not-403', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const project = await t.run(async (ctx) => ctx.db.get(projectId));
    const outsider = await seedProject(t);

    const asOutsider = outsider.asMember;
    expect(
      await asOutsider.query(api.projects.findProjectBySlug, {
        slug: assertDefined(project).slug,
      }),
    ).toBeNull();
    expect(
      await asMember.query(api.projects.findProjectBySlug, { slug: 'does-not-exist' }),
    ).toBeNull();

    const found = await asMember.query(api.projects.findProjectBySlug, {
      slug: assertDefined(project).slug,
    });
    expect(found?.project._id).toBe(projectId);
  });
});

describe('projects.deleteProjectAsOwner', () => {
  it('only the owner can delete, and only with a matching name', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t, { role: 'owner' });
    const admin = await t.run(async (ctx) =>
      ctx.db.insert('users', { email: 'admin@example.com' }),
    );
    await t.run(async (ctx) =>
      ctx.db.insert('members', { projectId, userId: admin, role: 'admin' }),
    );
    const asAdmin = t.withIdentity({ subject: `${admin}|` });
    const project = await t.run(async (ctx) => ctx.db.get(projectId));

    await expect(
      asAdmin.mutation(api.projects.deleteProjectAsOwner, {
        projectId,
        name: assertDefined(project).name,
      }),
    ).rejects.toThrow();

    await expect(
      asMember.mutation(api.projects.deleteProjectAsOwner, { projectId, name: 'wrong name' }),
    ).rejects.toThrow();

    await asMember.mutation(api.projects.deleteProjectAsOwner, {
      projectId,
      name: assertDefined(project).name,
    });
    expect(await t.run(async (ctx) => ctx.db.get(projectId))).toBeNull();
  });
});
