import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toStatusPageConfig } from './to-status-page-config';
import type { StatusPageConfig } from './types';

export async function setStatusPageLogo(args: {
  projectId: Id<'projects'>;
  configId: Id<'statusPageConfigs'>;
  storageId: Id<'_storage'>;
}): Promise<StatusPageConfig> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchMutation(api.statusPages.setLogo, args, { token });
  return toStatusPageConfig(doc);
}
