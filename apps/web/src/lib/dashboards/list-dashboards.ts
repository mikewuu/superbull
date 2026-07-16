import { anyApi } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { SavedDashboard } from './types';

export async function listDashboards(): Promise<SavedDashboard[]> {
  const client = createServerConvexClient();
  const ref = anyApi.dashboards?.list;
  if (!ref) {
    throw new Error('missing dashboards.list function reference');
  }
  const docs = await client.query(ref, {});
  return docs.map(toSavedDashboard);
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
