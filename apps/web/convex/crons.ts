import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

// Hourly is only the worst-case retention lag, not a per-run delete cap:
// purgeExpired self-continues until the backlog is drained, so each trigger
// removes every event past the window no matter how many accumulated.
const crons = cronJobs();

crons.interval('purge expired ingest events', { hours: 1 }, internal.ingest.purgeExpired, {});

export default crons;
