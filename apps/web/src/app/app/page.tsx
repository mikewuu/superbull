import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '../../../convex/_generated/api';

export const dynamic = 'force-dynamic';

// Every user always has >=1 project in practice (auth.ts bootstraps a
// personal project on first sign-in) — the zero case just falls through to
// a create-project screen instead of crashing.
export default async function AppRootPage() {
  const token = await convexAuthNextjsToken();
  const memberships = await fetchQuery(api.projects.listProjectsByUser, {}, { token });

  const first = memberships[0];
  if (first) {
    redirect(`/app/${first.project.slug}`);
  }
  redirect('/app/new');
}
