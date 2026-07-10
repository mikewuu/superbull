import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { SavedDashboard } from './types';

export async function findDashboardById(dashboardId: string): Promise<SavedDashboard | null> {
  const client = createServerConvexClient();
  const ref = anyApi.dashboards?.findById;
  if (!ref) {
    throw new Error('missing dashboards.findById function reference');
  }
  const doc = await client.query(ref, { id: dashboardId });
  if (!doc) {
    return null;
  }
  return toSavedDashboard(doc);
}

function toSavedDashboard(doc: {
  _id: string;
  _creationTime: number;
  name: string;
  cards: SavedDashboard['cards'];
}): SavedDashboard {
  return {
    id: doc._id,
    name: doc.name,
    cards: doc.cards,
    created_at: new Date(doc._creationTime),
  };
}
