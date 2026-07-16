import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';

// TRANSITIONAL — global (unscoped by workspace) delete, backing ONLY the
// remove_connector MCP tool under the global SUPERBULL_API_TOKEN. Goes away
// when the per-workspace-API-keys-vs-global-token decision lands
// (TODO(7.2e), open with the owner).
export async function deleteConnectorLegacy(id: string): Promise<void> {
  const client = createServerConvexClient();
  await client.mutation(api.connectors.remove, { id });
}
