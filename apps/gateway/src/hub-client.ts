import type { IngestEvent } from '@superbull/protocol';

export interface ConnectorLookup {
  connectorId: string;
  workspaceId: string;
  name: string;
}

export interface MarkConnectedArgs {
  connectorId: string;
  version: string;
  queues: string[];
}

export interface MarkDisconnectedArgs {
  connectorId: string;
}

export interface RecordEventBatchArgs {
  connectorId: string;
  events: IngestEvent[];
}

export interface RecordEventBatchResult {
  accepted: number;
  deduped: number;
}

export interface HubClient {
  findConnectorByTokenHash(tokenHash: string): Promise<ConnectorLookup | null>;
  markConnected(args: MarkConnectedArgs): Promise<void>;
  markDisconnected(args: MarkDisconnectedArgs): Promise<void>;
  recordEventBatch(args: RecordEventBatchArgs): Promise<RecordEventBatchResult>;
}
