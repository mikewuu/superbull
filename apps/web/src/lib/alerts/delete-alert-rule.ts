import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';

export async function deleteAlertRule(id: string): Promise<void> {
  const client = createServerConvexClient();
  await client.mutation(api.alerts.remove, { id });
}
