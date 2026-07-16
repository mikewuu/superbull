import type { Doc } from '../../../convex/_generated/dataModel';
import type { Connector } from './types';

export function toConnector(doc: Doc<'connectors'>): Connector {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    name: doc.name,
    url: doc.url ?? null,
    token: doc.token ?? null,
    version: doc.version ?? null,
    queues: doc.queues ?? null,
    lastConnectedAt: doc.lastConnectedAt ?? null,
    lastDisconnectedAt: doc.lastDisconnectedAt ?? null,
    created_at: new Date(doc._creationTime),
  };
}
