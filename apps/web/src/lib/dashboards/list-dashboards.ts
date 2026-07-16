import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toSavedDashboard } from './to-saved-dashboard';
import type { SavedDashboard } from './types';

export async function listDashboards(workspaceId: Id<'workspaces'>): Promise<SavedDashboard[]> {
  const token = await convexAuthNextjsToken();
  const docs = await fetchQuery(api.dashboards.list, { workspaceId }, { token });
  return docs.map(toSavedDashboard);
}
