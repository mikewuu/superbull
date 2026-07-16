import { createJob } from '@nextastic/queue';
import { getAlertDigestSummary } from '../lib/alerts/get-alert-digest-summary';
import { listAlertRules } from '../lib/alerts/list-alert-rules';
import { sendDigestEmail } from '../lib/email/send-digest-email';

const oneDayMs = 24 * 60 * 60 * 1000;

export const sendDigest = createJob<Record<string, never>, void>({
  id: 'send-digest',
  handle: async (_payload, { log }) => {
    const rules = await listAlertRules();
    const recipients = [...new Set(rules.map((rule) => rule.email))];
    if (recipients.length === 0) {
      log('[send-digest] no alert rule emails; skipping');
      return;
    }

    const { perSource } = await getAlertDigestSummary(Date.now() - oneDayMs);
    for (const to of recipients) {
      await sendDigestEmail({ to, perSource });
    }
    log(`[send-digest] sent digest to ${recipients.length} recipient(s)`);
  },
});
