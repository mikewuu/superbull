import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { hashToken } from './hash-token';

export async function findCaller(rawToken: string) {
  const client = createServerConvexClient();
  if (rawToken.startsWith('sbh_')) {
    return await client.mutation(api.apiKeys.findApiKeyCaller, {
      keyHash: hashToken(rawToken),
    });
  }
  if (rawToken.startsWith('sbho_')) {
    return await client.query(api.apiKeys.findOAuthCaller, { rawToken });
  }
  return null;
}
