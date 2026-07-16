import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// TRANSITIONAL — backs POST /api/sources/register (deleted in Round 3). The
// mutation attaches the connector to the oldest workspace in the db, since
// this route predates workspaces and has no way to name one.
export async function upsertConnectorByName(args: {
  name: string;
  url: string;
  token: string;
}): Promise<Connector> {
  const client = createServerConvexClient();
  const doc = await client.mutation(api.connectors.upsertByName, args);
  return toConnector(doc);
}
