import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { ProxySource } from './types';

export async function createSource(args: {
  name: string;
  url: string;
  token: string;
}): Promise<ProxySource> {
  const client = createServerConvexClient();
  const doc = await client.mutation(api.proxySources.create, args);
  return toProxySource(doc);
}

function toProxySource(doc: Doc<'proxySources'>): ProxySource {
  return {
    id: doc._id,
    name: doc.name,
    url: doc.url,
    token: doc.token,
    created_at: new Date(doc._creationTime),
  };
}
