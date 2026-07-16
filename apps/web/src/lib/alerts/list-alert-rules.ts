import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toAlertRule } from './to-alert-rule';
import type { AlertRule } from './types';

export async function listAlertRules(workspaceId: Id<'workspaces'>): Promise<AlertRule[]> {
  const token = await convexAuthNextjsToken();
  const docs = await fetchQuery(api.alerts.list, { workspaceId }, { token });
  return docs.map(toAlertRule);
}
