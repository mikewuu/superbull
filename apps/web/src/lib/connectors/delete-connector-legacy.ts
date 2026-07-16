import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';

// TRANSITIONAL — backs DELETE /api/sources/[sourceId]. Round 3 deletes this.
export async function deleteConnectorLegacy(id: string): Promise<void> {
  const client = createServerConvexClient();
  await client.mutation(api.connectors.remove, { id });
}
