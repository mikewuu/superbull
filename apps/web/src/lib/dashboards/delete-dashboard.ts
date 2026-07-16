import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export async function deleteDashboard(
  workspaceId: Id<'workspaces'>,
  dashboardId: Id<'savedDashboards'>,
): Promise<void> {
  const token = await convexAuthNextjsToken();
  await fetchMutation(api.dashboards.remove, { workspaceId, id: dashboardId }, { token });
}
