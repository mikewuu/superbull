import type { SavedDashboard } from './types';

export function toSavedDashboard(doc: {
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
