import { createJob } from '@nextastic/queue';
import { api } from '../../convex/_generated/api';
import { createServerConvexClient } from '../lib/convex/create-server-convex-client';

export const cleanupExpiredOAuth = createJob<Record<string, never>, void>({
  id: 'cleanup-expired-oauth',
  handle: async () => {
    const client = createServerConvexClient();
    await client.mutation(api.oauthProvider.cleanupExpiredOAuth, {});
  },
});
