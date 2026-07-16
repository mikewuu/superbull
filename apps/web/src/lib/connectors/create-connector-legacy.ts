import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// TRANSITIONAL — backs POST /api/sources (the old HTTP proxy registration
// flow: name + url + token, no workspace supplied by the caller). The
// mutation itself attaches the connector to the oldest workspace in the db.
// Round 3 deletes this.
export async function createConnectorLegacy(args: {
  name: string;
  url: string;
  token: string;
}): Promise<Connector> {
  const client = createServerConvexClient();
  const doc = await client.mutation(api.connectors.create, args);
  return toConnector(doc);
}
