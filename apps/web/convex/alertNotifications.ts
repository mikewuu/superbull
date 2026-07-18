'use node';

import { v } from 'convex/values';
import { api } from './_generated/api';
import { action } from './_generated/server';
import { requireInternalToken } from './access';
import { groupRecipientsByProject } from './emails/digestRecipients';
import { sendAlertEmail } from './emails/sendAlertEmail';
import { sendDigestEmail } from './emails/sendDigestEmail';

const oneDayMs = 86_400_000;

export const evaluateAndNotify = action({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const { evaluated, to_notify: notifications } = await ctx.runMutation(api.alerts.evaluate, {
      internalToken: args.internalToken,
    });

    for (const notification of notifications) {
      await sendAlertEmail({
        to: notification.email,
        kind: notification.kind,
        type: notification.type,
        summary: notification.summary,
        queueName: notification.queue_name,
      });
    }

    console.log(
      `[alertNotifications.evaluateAndNotify] evaluated ${evaluated} rule(s), notified ${notifications.length}`,
    );
  },
});

export const sendDailyDigest = action({
  args: { internalToken: v.string() },
  handler: async (ctx, args) => {
    requireInternalToken(args.internalToken);
    const rules = await ctx.runQuery(api.alerts.listAllRulesForDigest, {
      internalToken: args.internalToken,
    });
    const recipientsByProject = groupRecipientsByProject(rules);
    if (recipientsByProject.length === 0) {
      console.log('[alertNotifications.sendDailyDigest] no alert rule emails; skipping');
      return;
    }

    const { perConnector } = await ctx.runQuery(api.alerts.digestSummary, {
      internalToken: args.internalToken,
      sinceTs: Date.now() - oneDayMs,
    });
    let sentCount = 0;

    for (const recipients of recipientsByProject) {
      const projectConnectors = perConnector.filter(
        (connector) => connector.projectId === recipients.projectId,
      );
      for (const to of recipients.emails) {
        await sendDigestEmail({ to, perConnector: projectConnectors });
        sentCount += 1;
      }
    }

    console.log(`[alertNotifications.sendDailyDigest] sent digest to ${sentCount} recipient(s)`);
  },
});
