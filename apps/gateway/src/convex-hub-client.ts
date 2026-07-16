import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import type {
  ConnectorLookup,
  HubClient,
  MarkConnectedArgs,
  MarkDisconnectedArgs,
  RecordEventBatchArgs,
  RecordEventBatchResult,
} from './hub-client';

const findByEnrollmentTokenHashRef = makeFunctionReference<'query'>(
  'connectors:findByEnrollmentTokenHash',
);
const markConnectedRef = makeFunctionReference<'mutation'>('connectors:markConnected');
const markDisconnectedRef = makeFunctionReference<'mutation'>('connectors:markDisconnected');
const recordBatchRef = makeFunctionReference<'mutation'>('ingest:recordBatch');

export function createConvexHubClient(args: {
  convexUrl: string;
  internalToken: string;
}): HubClient {
  const { convexUrl, internalToken } = args;
  const client = new ConvexHttpClient(convexUrl);

  return {
    async findConnectorByTokenHash(tokenHash: string): Promise<ConnectorLookup | null> {
      return await client.query(findByEnrollmentTokenHashRef, { internalToken, tokenHash });
    },

    async markConnected(args: MarkConnectedArgs): Promise<void> {
      await client.mutation(markConnectedRef, { internalToken, ...args });
    },

    async markDisconnected(args: MarkDisconnectedArgs): Promise<void> {
      await client.mutation(markDisconnectedRef, { internalToken, ...args });
    },

    async recordEventBatch(args: RecordEventBatchArgs): Promise<RecordEventBatchResult> {
      return await client.mutation(recordBatchRef, { internalToken, ...args });
    },
  };
}
