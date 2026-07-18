import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

export async function findConnectorByIdForUser(args: {
  userId: string;
  connectorId: string;
  requiredProjectId: string | null;
}): Promise<Connector | null> {
  const client = createServerConvexClient();
  const doc = await client.query(api.connectors.findConnectorByIdForUser, {
    userId: args.userId,
    connectorId: args.connectorId,
    requiredProjectId: args.requiredProjectId ?? undefined,
  });
  return doc ? toConnector(doc) : null;
}
