import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';

export async function deleteConnectorForUser(args: {
  userId: string;
  connectorId: string;
  requiredProjectId: string | null;
}): Promise<void> {
  const client = createServerConvexClient();
  await client.mutation(api.connectors.removeConnectorForUser, {
    userId: args.userId,
    connectorId: args.connectorId,
    requiredProjectId: args.requiredProjectId ?? undefined,
  });
}
