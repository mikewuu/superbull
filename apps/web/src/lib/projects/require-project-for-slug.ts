import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { notFound } from 'next/navigation';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export interface ProjectForSlug {
  project: Doc<'projects'>;
  member: Doc<'members'>;
}

// Shared by every page/layout/action under /app/[projectSlug]/** — resolves
// the slug to a project the signed-in caller is a member of, or calls
// next/navigation's notFound() (404, not a redirect) when the slug doesn't
// exist or the caller isn't a member. findProjectBySlug already returns
// null for both cases so membership is never leaked by the error shape.
export async function requireProjectForSlug(slug: string): Promise<ProjectForSlug> {
  const token = await convexAuthNextjsToken();
  const result = await fetchQuery(api.projects.findProjectBySlug, { slug }, { token });
  if (!result) {
    notFound();
  }
  return result;
}
