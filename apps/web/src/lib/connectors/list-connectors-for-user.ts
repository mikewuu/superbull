import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

export async function listConnectorsForUser(
  userId: string,
  requiredProjectId: string | null,
): Promise<Connector[]> {
  const client = createServerConvexClient();
  const docs = await client.query(api.connectors.listConnectorsForUser, {
    userId,
    requiredProjectId: requiredProjectId ?? undefined,
  });
  return docs.map(toConnector);
}
