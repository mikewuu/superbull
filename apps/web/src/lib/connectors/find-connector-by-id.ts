import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toConnector } from './to-connector';
import type { Connector } from './types';

// Workspace-scoped: verifies the caller is a member of `workspaceId` before
// returning anything, so a connectorId can never be used to read another
// tenant's connector (including its transitional url/token fields, which
// the SPA embed route + forwardToProxy call site rely on this function for).
export async function findConnectorById(
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
): Promise<Connector | null> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchQuery(api.connectors.getById, { workspaceId, connectorId }, { token });
  return doc ? toConnector(doc) : null;
}
