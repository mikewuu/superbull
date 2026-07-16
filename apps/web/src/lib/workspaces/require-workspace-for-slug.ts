import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { notFound } from 'next/navigation';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export interface WorkspaceForSlug {
  workspace: Doc<'workspaces'>;
  member: Doc<'members'>;
}

// Shared by every page/layout/action under /app/[workspaceSlug]/** — resolves
// the slug to a workspace the signed-in caller is a member of, or calls
// next/navigation's notFound() (404, not a redirect) when the slug doesn't
// exist or the caller isn't a member. findWorkspaceBySlug already returns
// null for both cases so membership is never leaked by the error shape.
export async function requireWorkspaceForSlug(slug: string): Promise<WorkspaceForSlug> {
  const token = await convexAuthNextjsToken();
  const result = await fetchQuery(api.workspaces.findWorkspaceBySlug, { slug }, { token });
  if (!result) {
    notFound();
  }
  return result;
}
