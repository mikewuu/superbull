import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toStatusPageConfig } from './to-status-page-config';
import type { StatusPageConfig } from './types';

export async function getStatusPageConfig(args: {
  workspaceId: Id<'workspaces'>;
  connectorId: Id<'connectors'>;
}): Promise<StatusPageConfig | null> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchQuery(api.statusPages.getByConnector, args, { token });
  return doc ? toStatusPageConfig(doc) : null;
}
