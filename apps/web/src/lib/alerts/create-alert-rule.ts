import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { AlertRule, AlertRuleType } from './types';

export async function createAlertRule(args: {
  sourceId?: string;
  type: AlertRuleType;
  queueName?: string;
  threshold?: number;
  windowMinutes?: number;
  email: string;
  isEnabled: boolean;
}): Promise<AlertRule> {
  const client = createServerConvexClient();
  const doc = await client.mutation(api.alerts.create, args);
  return toAlertRule(doc);
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
