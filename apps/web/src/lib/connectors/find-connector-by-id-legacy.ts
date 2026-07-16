import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// TRANSITIONAL — global (unscoped by workspace) lookup by id, used by the
// hub-token API routes (/api/sources/[sourceId]) and /api/ingest's
// per-connector plaintext-token auth. Round 3 deletes this.
export async function findConnectorByIdLegacy(id: string): Promise<Connector | null> {
  const client = createServerConvexClient();
  const doc = await client.query(api.connectors.findById, { id });
  return doc ? toConnector(doc) : null;
}
