import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toSavedDashboard } from './to-saved-dashboard';
import type { DashboardCard, SavedDashboard } from './types';

export async function createDashboard(args: {
  workspaceId: Id<'workspaces'>;
  name: string;
  cards: DashboardCard[];
}): Promise<SavedDashboard> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchMutation(api.dashboards.create, args, { token });
  return toSavedDashboard(doc);
}
