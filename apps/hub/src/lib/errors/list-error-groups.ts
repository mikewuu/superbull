import { makeFunctionReference } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { ErrorGroup, ErrorGroupState } from './types';

const listGroupsRef = makeFunctionReference<'query'>('errors:listGroups');

interface ErrorGroupDoc {
  _id: string;
  sourceId: string;
  fingerprint: string;
  queueName: string;
  jobName?: string;
  message: string;
  state: ErrorGroupState;
  count: number;
  firstSeenTs: number;
  lastSeenTs: number;
  lastJobId?: string;
  isRegression: boolean;
}

export async function listErrorGroups(args: {
  sourceId: string;
  state?: ErrorGroupState;
}): Promise<ErrorGroup[]> {
  const client = createServerConvexClient();
  const docs: ErrorGroupDoc[] = await client.query(listGroupsRef, args);
  return docs.map(toErrorGroup);
}

function toErrorGroup(doc: ErrorGroupDoc): ErrorGroup {
  return {
    id: doc._id,
    sourceId: doc.sourceId,
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
