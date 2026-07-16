import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export async function generateStatusPageLogoUploadUrl(
  workspaceId: Id<'workspaces'>,
): Promise<string> {
  const token = await convexAuthNextjsToken();
  return await fetchMutation(api.statusPages.generateLogoUploadUrl, { workspaceId }, { token });
}
