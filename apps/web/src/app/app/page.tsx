import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '../../../convex/_generated/api';

export const dynamic = 'force-dynamic';

// Every user always has >=1 workspace in practice (auth.ts bootstraps a
// personal workspace on first sign-in) — the zero case just falls through to
// a create-workspace screen instead of crashing.
export default async function AppRootPage() {
  const token = await convexAuthNextjsToken();
  const memberships = await fetchQuery(api.workspaces.listWorkspacesByUser, {}, { token });

  const first = memberships[0];
  if (first) {
    redirect(`/app/${first.workspace.slug}`);
  }
  redirect('/app/new');
}
