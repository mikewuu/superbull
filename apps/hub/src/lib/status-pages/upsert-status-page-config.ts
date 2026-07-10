import { makeFunctionReference } from 'convex/server';
import type { Doc } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { StatusPageConfig } from './types';

const upsert = makeFunctionReference<'mutation'>('statusPages:upsert');

export async function upsertStatusPageConfig(args: {
  sourceId: string;
  slug: string;
  isEnabled: boolean;
  title: string;
  queueNames?: string[];
}): Promise<StatusPageConfig> {
  const client = createServerConvexClient();
  const doc = await client.mutation(upsert, args);
  return toStatusPageConfig(doc);
}

function toStatusPageConfig(doc: Doc<'statusPageConfigs'>): StatusPageConfig {
  return {
    id: doc._id,
    sourceId: doc.sourceId,
    slug: doc.slug,
    isEnabled: doc.isEnabled,
    title: doc.title,
    logoStorageId: doc.logoStorageId ?? null,
    queueNames: doc.queueNames ?? [],
  };
}
