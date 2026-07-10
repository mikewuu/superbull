import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { AlertRule } from './types';

export async function listAlertRules(): Promise<AlertRule[]> {
  const client = createServerConvexClient();
  const docs = await client.query(api.alerts.list, {});
  return docs.map(toAlertRule);
}

function toAlertRule(doc: Doc<'alertRules'>): AlertRule {
  return {
    id: doc._id,
    sourceId: doc.sourceId ?? null,
    type: doc.type,
    queueName: doc.queueName ?? null,
    threshold: doc.threshold ?? null,
    windowMinutes: doc.windowMinutes ?? null,
    email: doc.email,
    isEnabled: doc.isEnabled,
  };
}
