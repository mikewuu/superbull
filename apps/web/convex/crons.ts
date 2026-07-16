import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Replaces the @nextastic/queue worker's two repeat jobs (previously
// dispatched from apps/web/src/scripts/start-queue-worker.ts, now deleted).
// See apps/web/convex/alertNotifications.ts for the handlers.

crons.interval('evaluate alerts', { minutes: 5 }, internal.alertNotifications.evaluateAndNotify);

crons.daily(
  'send daily digest',
  { hourUTC: 9, minuteUTC: 0 },
  internal.alertNotifications.sendDailyDigest,
);

export default crons;
