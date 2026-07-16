import type { Doc } from '../../../convex/_generated/dataModel';
import type { StatusPageConfig } from './types';

export function toStatusPageConfig(doc: Doc<'statusPageConfigs'>): StatusPageConfig {
  return {
    id: doc._id,
    connectorId: doc.connectorId,
    slug: doc.slug,
    isEnabled: doc.isEnabled,
    title: doc.title,
    logoStorageId: doc.logoStorageId ?? null,
    queueNames: doc.queueNames ?? [],
  };
}
