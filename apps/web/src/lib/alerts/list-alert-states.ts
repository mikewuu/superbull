import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { AlertState } from './types';

export async function listAlertStates(): Promise<AlertState[]> {
  const client = createServerConvexClient();
  const docs = await client.query(api.alerts.listStates, {});
  return docs.map(toAlertState);
}

function toAlertState(doc: Doc<'alertStates'>): AlertState {
  return {
    ruleId: doc.ruleId,
    state: doc.state,
    lastFiredTs: doc.lastFiredTs ?? null,
    lastNotifiedTs: doc.lastNotifiedTs ?? null,
  };
}
