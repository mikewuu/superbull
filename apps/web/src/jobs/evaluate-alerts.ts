import { createJob } from '@nextastic/queue';
import { evaluateAlertRules } from '../lib/alerts/evaluate-alert-rules';
import { sendAlertEmail } from '../lib/email/send-alert-email';

export const evaluateAlerts = createJob<Record<string, never>, void>({
  id: 'evaluate-alerts',
  handle: async (_payload, { log }) => {
    const { evaluated, toNotify } = await evaluateAlertRules();
    for (const notification of toNotify) {
      await sendAlertEmail({
        to: notification.email,
        kind: notification.kind,
        type: notification.type,
        summary: notification.summary,
        queueName: notification.queueName,
      });
    }
    log(`[evaluate-alerts] evaluated ${evaluated} rule(s), notified ${toNotify.length}`);
  },
});
