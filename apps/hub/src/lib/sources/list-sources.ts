import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { ProxySource } from './types';

export async function listSources(): Promise<ProxySource[]> {
  const client = createServerConvexClient();
  const docs = await client.query(api.proxySources.list, {});
  return docs.map(toProxySource);
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
