import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export async function removeConnector(
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
): Promise<void> {
  const token = await convexAuthNextjsToken();
  await fetchMutation(api.connectors.removeConnector, { workspaceId, connectorId }, { token });
}
