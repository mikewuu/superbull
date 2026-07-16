import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// TRANSITIONAL — backs GET /api/sources (the global SUPERBULL_API_TOKEN hub
// API), unscoped by workspace. Round 3 deletes this alongside the rest of
// the hub-token connector surface.
export async function listConnectorsLegacy(): Promise<Connector[]> {
  const client = createServerConvexClient();
  const docs = await client.query(api.connectors.list, {});
  return docs.map(toConnector);
}
