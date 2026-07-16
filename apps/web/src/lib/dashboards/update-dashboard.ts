import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { DashboardCard, SavedDashboard } from './types';

export async function updateDashboard(args: {
  id: string;
  name?: string;
  cards?: DashboardCard[];
}): Promise<SavedDashboard> {
  const client = createServerConvexClient();
  const ref = anyApi.dashboards?.update;
  if (!ref) {
    throw new Error('missing dashboards.update function reference');
  }
  const doc = await client.mutation(ref, args);
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
