import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export async function deleteDashboard(
  projectId: Id<'projects'>,
  dashboardId: Id<'savedDashboards'>,
): Promise<void> {
  const token = await convexAuthNextjsToken();
  await fetchMutation(api.dashboards.remove, { projectId, id: dashboardId }, { token });
}
