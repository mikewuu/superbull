import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toAlertRule } from './to-alert-rule';
import type { AlertRule, AlertRuleType } from './types';

export async function createAlertRule(args: {
  workspaceId: Id<'workspaces'>;
  connectorId?: Id<'connectors'>;
  type: AlertRuleType;
  queueName?: string;
  threshold?: number;
  windowMinutes?: number;
  email: string;
  isEnabled: boolean;
}): Promise<AlertRule> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchMutation(api.alerts.create, args, { token });
  return toAlertRule(doc);
}
