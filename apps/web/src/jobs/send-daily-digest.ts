import { createJob } from '@nextastic/queue';
import { api } from '../../convex/_generated/api';
import { createServerConvexClient } from '../lib/convex/create-server-convex-client';

export const sendDailyDigest = createJob<Record<string, never>, void>({
  id: 'send-daily-digest',
  handle: async () => {
    const client = createServerConvexClient();
    await client.action(api.alertNotifications.sendDailyDigest, {});
  },
});
