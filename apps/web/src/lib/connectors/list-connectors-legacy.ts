import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// TRANSITIONAL — global (unscoped by project) listing, backing ONLY the
// list_connectors MCP tool under the global SUPERBULL_API_TOKEN. Goes away
// when the per-project-API-keys-vs-global-token decision lands
// (TODO(7.2e), open with the owner).
export async function listConnectorsLegacy(): Promise<Connector[]> {
  const client = createServerConvexClient();
  const docs = await client.query(api.connectors.list, {});
  return docs.map(toConnector);
}
