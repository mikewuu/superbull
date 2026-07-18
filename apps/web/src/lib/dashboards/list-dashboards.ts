import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toSavedDashboard } from './to-saved-dashboard';
import type { SavedDashboard } from './types';

export async function listDashboards(projectId: Id<'projects'>): Promise<SavedDashboard[]> {
  const token = await convexAuthNextjsToken();
  const docs = await fetchQuery(api.dashboards.list, { projectId }, { token });
  return docs.map(toSavedDashboard);
}
