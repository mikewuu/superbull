import type { Doc } from '../../../convex/_generated/dataModel';
import type { ErrorGroup } from './types';

export function toErrorGroup(doc: Doc<'errorGroups'>): ErrorGroup {
  return {
    id: doc._id,
    connectorId: doc.connectorId,
    fingerprint: doc.fingerprint,
    queueName: doc.queueName,
    jobName: doc.jobName,
    message: doc.message,
    state: doc.state,
    count: doc.count,
    firstSeenTs: doc.firstSeenTs,
    lastSeenTs: doc.lastSeenTs,
    lastJobId: doc.lastJobId,
    isRegression: doc.isRegression,
  };
}
