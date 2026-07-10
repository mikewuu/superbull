import { makeFunctionReference } from 'convex/server';
import type { Doc } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { StatusPageConfig } from './types';

const getBySource = makeFunctionReference<'query'>('statusPages:getBySource');

export async function getStatusPageConfig(args: {
  sourceId: string;
}): Promise<StatusPageConfig | null> {
  const client = createServerConvexClient();
  const doc = await client.query(getBySource, args);
  return doc ? toStatusPageConfig(doc) : null;
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
