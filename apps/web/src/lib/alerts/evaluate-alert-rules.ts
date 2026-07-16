import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { AlertNotification } from './types';

export async function evaluateAlertRules(): Promise<{
  evaluated: number;
  toNotify: AlertNotification[];
}> {
  const client = createServerConvexClient();
  const result = await client.mutation(api.alerts.evaluate, {});
  return {
    evaluated: result.evaluated,
    toNotify: result.to_notify.map((entry) => ({
      ruleId: entry.rule_id,
      email: entry.email,
      type: entry.type,
      queueName: entry.queue_name,
      summary: entry.summary,
      kind: entry.kind,
    })),
  };
}
