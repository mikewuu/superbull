import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// TRANSITIONAL — global (unscoped by project) lookup by id, backing ONLY
// the MCP queue/job tools that still run under the global
// SUPERBULL_API_TOKEN. Goes away when the per-project-API-keys-vs-global-
// token decision lands (TODO(7.2e), open with the owner).
export async function findConnectorByIdLegacy(id: string): Promise<Connector | null> {
  const client = createServerConvexClient();
  const doc = await client.query(api.connectors.findById, { id });
  return doc ? toConnector(doc) : null;
}
