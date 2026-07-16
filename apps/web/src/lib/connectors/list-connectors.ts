import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toConnector } from './to-connector';
import type { Connector } from './types';

export async function listConnectors(workspaceId: Id<'workspaces'>): Promise<Connector[]> {
  const token = await convexAuthNextjsToken();
  const docs = await fetchQuery(api.connectors.listByWorkspace, { workspaceId }, { token });
  return docs.map(toConnector);
}
