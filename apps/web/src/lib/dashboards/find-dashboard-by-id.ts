import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toSavedDashboard } from './to-saved-dashboard';
import type { SavedDashboard } from './types';

export async function findDashboardById(
  workspaceId: Id<'workspaces'>,
  dashboardId: Id<'savedDashboards'>,
): Promise<SavedDashboard | null> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchQuery(
    api.dashboards.findById,
    { workspaceId, id: dashboardId },
    { token },
  );
  return doc ? toSavedDashboard(doc) : null;
}
