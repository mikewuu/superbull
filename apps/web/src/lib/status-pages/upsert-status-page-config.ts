import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toStatusPageConfig } from './to-status-page-config';
import type { StatusPageConfig } from './types';

export async function upsertStatusPageConfig(args: {
  projectId: Id<'projects'>;
  connectorId: Id<'connectors'>;
  slug: string;
  isEnabled: boolean;
  title: string;
  queueNames?: string[];
}): Promise<StatusPageConfig> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchMutation(api.statusPages.upsert, args, { token });
  return toStatusPageConfig(doc);
}
