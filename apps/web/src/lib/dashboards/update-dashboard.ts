import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toSavedDashboard } from './to-saved-dashboard';
import type { DashboardCard, SavedDashboard } from './types';

export async function updateDashboard(args: {
  workspaceId: Id<'workspaces'>;
  id: Id<'savedDashboards'>;
  name?: string;
  cards?: DashboardCard[];
}): Promise<SavedDashboard> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchMutation(api.dashboards.update, args, { token });
  return toSavedDashboard(doc);
}
