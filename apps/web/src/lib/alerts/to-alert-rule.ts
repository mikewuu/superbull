import type { Doc } from '../../../convex/_generated/dataModel';
import type { AlertRule } from './types';

export function toAlertRule(doc: Doc<'alertRules'>): AlertRule {
  return {
    id: doc._id,
    connectorId: doc.connectorId ?? null,
    type: doc.type,
    queueName: doc.queueName ?? null,
    threshold: doc.threshold ?? null,
    windowMinutes: doc.windowMinutes ?? null,
    email: doc.email,
    isEnabled: doc.isEnabled,
  };
}
