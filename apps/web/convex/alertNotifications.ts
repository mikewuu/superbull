'use node';

// Renders and sends the alert/digest emails that used to be dispatched by
// the @nextastic/queue worker (apps/web/src/scripts/start-queue-worker.ts,
// deleted). Scheduled by apps/web/convex/crons.ts. Needs the Node.js runtime
// because @react-email/render and resend both rely on Node built-ins.
//
// FOLLOW-UP (owned by convex/alerts.ts's maintainer, not this file): `evaluate`,
// `digestSummary`, and `listAllRulesForDigest` in convex/alerts.ts are PUBLIC
// functions gated by an `internalToken` string arg rather than
// `internalMutation`/`internalQuery`. We call them here via `api.alerts.*` +
// `ctx.runMutation`/`ctx.runQuery`, passing `process.env.CONVEX_INTERNAL_TOKEN`
// the same way the old app-side job runner (and the gateway) do. Once true
// `internal.alerts.*` variants exist, drop the token plumbing below.

import { api } from './_generated/api';
import { internalAction } from './_generated/server';
import { groupRecipientsByWorkspace } from './emails/digestRecipients';
import { sendAlertEmail } from './emails/sendAlertEmail';
import { sendDigestEmail } from './emails/sendDigestEmail';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getInternalTokenOrThrow(): string {
  const token = process.env.CONVEX_INTERNAL_TOKEN;
  if (!token) {
    throw new Error('CONVEX_INTERNAL_TOKEN is not configured on this Convex deployment');
  }
  return token;
}

/**
 * Runs every 5 minutes (see crons.ts). Evaluates all alert rules and emails
 * a notification for each rule that started or stopped firing.
 */
export const evaluateAndNotify = internalAction({
  args: {},
  handler: async (ctx) => {
    const internalToken = getInternalTokenOrThrow();
    const { evaluated, to_notify: toNotify } = await ctx.runMutation(api.alerts.evaluate, {
      internalToken,
    });

    for (const notification of toNotify) {
      await sendAlertEmail({
        to: notification.email,
        kind: notification.kind,
        type: notification.type,
        summary: notification.summary,
        queueName: notification.queue_name,
      });
    }

    console.log(
      `[alertNotifications.evaluateAndNotify] evaluated ${evaluated} rule(s), notified ${toNotify.length}`,
    );
  },
});

/**
 * Runs daily at 09:00 UTC (see crons.ts). Sends one digest email per
 * (workspace, distinct alert-rule email) pair, summarizing that workspace's
 * connectors over the last 24h. Scoped per-workspace so a recipient's inbox
 * never sees another workspace's connector stats.
 */
export const sendDailyDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    const internalToken = getInternalTokenOrThrow();
    const rules = await ctx.runQuery(api.alerts.listAllRulesForDigest, { internalToken });
    const groups = groupRecipientsByWorkspace(rules);
    if (groups.length === 0) {
      console.log('[alertNotifications.sendDailyDigest] no alert rule emails; skipping');
      return;
    }

    const { perConnector } = await ctx.runQuery(api.alerts.digestSummary, {
      internalToken,
      sinceTs: Date.now() - ONE_DAY_MS,
    });

    let sentCount = 0;
    for (const group of groups) {
      const workspaceConnectors = perConnector.filter(
        (connector) => connector.workspaceId === group.workspaceId,
      );
      for (const to of group.emails) {
        await sendDigestEmail({ to, perConnector: workspaceConnectors });
        sentCount += 1;
      }
    }

    console.log(`[alertNotifications.sendDailyDigest] sent digest to ${sentCount} recipient(s)`);
  },
});
