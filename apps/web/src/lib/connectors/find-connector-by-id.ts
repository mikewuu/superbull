import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// Workspace-scoped: verifies the caller is a member of `workspaceId` before
// returning anything, so a connectorId can never be used to read another
// tenant's connector — the SPA embed route and its gateway-RPC api route
// rely on this check before any request is forwarded to the connector.
export async function findConnectorById(
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
): Promise<Connector | null> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchQuery(api.connectors.getById, { workspaceId, connectorId }, { token });
  return doc ? toConnector(doc) : null;
}
