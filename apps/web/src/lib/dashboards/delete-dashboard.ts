import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';

export async function deleteDashboard(dashboardId: string): Promise<void> {
  const client = createServerConvexClient();
  const ref = anyApi.dashboards?.remove;
  if (!ref) {
    throw new Error('missing dashboards.remove function reference');
  }
  await client.mutation(ref, { id: dashboardId });
}
