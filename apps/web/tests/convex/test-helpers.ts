/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';

export const INTERNAL_TOKEN = 'test-internal-token';

export function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

type TestClient = ReturnType<typeof makeTestClient>;

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

// Seeds a user + project + owner membership directly (bypassing
// convex/auth.ts's afterUserCreatedOrUpdated bootstrap, which is exercised
// separately), and returns a client impersonating that user via
// `t.withIdentity`, mirroring how convex/access.ts's getAuthUserId resolves
// identity.subject as "<userId>|".
export async function seedProject(
  t: TestClient,
  opts?: { role?: 'owner' | 'admin' | 'member'; email?: string },
) {
  const role = opts?.role ?? 'owner';
  const email = opts?.email ?? `${unique('user')}@example.com`;

  const { userId, projectId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', { email });
    const projectId = await ctx.db.insert('projects', {
      name: unique('Project'),
      slug: unique('project'),
      createdAt: Date.now(),
    });
    await ctx.db.insert('members', { projectId, userId, role });
    return { userId, projectId };
  });

  const asMember = t.withIdentity({ subject: `${userId}|` });
  return { userId, projectId, asMember, email };
}

export function assertDefined<T>(value: T | null | undefined, message = 'expected a value'): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

export async function seedConnector(
  t: TestClient,
  projectId: Awaited<ReturnType<typeof seedProject>>['projectId'],
  opts?: { name?: string },
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('connectors', {
      projectId,
      name: opts?.name ?? unique('connector'),
    });
  });
}
