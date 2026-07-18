import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { AlertState } from './types';

function toAlertState(doc: {
  ruleId: string;
  state: 'firing' | 'resolved';
  lastFiredTs?: number;
  lastNotifiedTs?: number;
}): AlertState {
  return {
    ruleId: doc.ruleId,
    state: doc.state,
    lastFiredTs: doc.lastFiredTs ?? null,
    lastNotifiedTs: doc.lastNotifiedTs ?? null,
  };
}

export async function listAlertStates(projectId: Id<'projects'>): Promise<AlertState[]> {
  const token = await convexAuthNextjsToken();
  const docs = await fetchQuery(api.alerts.listStates, { projectId }, { token });
  return docs.map(toAlertState);
}
