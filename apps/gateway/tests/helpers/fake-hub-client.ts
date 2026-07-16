import { vi } from 'vitest';
import type {
  ConnectorLookup,
  HubClient,
  MarkConnectedArgs,
  MarkDisconnectedArgs,
  RecordEventBatchArgs,
  RecordEventBatchResult,
} from '../../src/hub-client';

export interface FakeHubClient extends HubClient {
  findConnectorByTokenHash: ReturnType<
    typeof vi.fn<(tokenHash: string) => Promise<ConnectorLookup | null>>
  >;
  markConnected: ReturnType<typeof vi.fn<(args: MarkConnectedArgs) => Promise<void>>>;
  markDisconnected: ReturnType<typeof vi.fn<(args: MarkDisconnectedArgs) => Promise<void>>>;
  recordEventBatch: ReturnType<
    typeof vi.fn<(args: RecordEventBatchArgs) => Promise<RecordEventBatchResult>>
  >;
}

export function createFakeHubClient(
  options: {
    lookups?: Record<string, ConnectorLookup>;
    recordEventBatch?: FakeHubClient['recordEventBatch'];
  } = {},
): FakeHubClient {
  const lookups = options.lookups ?? {};

  return {
    findConnectorByTokenHash: vi.fn(async (tokenHash: string) => lookups[tokenHash] ?? null),
    markConnected: vi.fn(async () => undefined),
    markDisconnected: vi.fn(async () => undefined),
    recordEventBatch: options.recordEventBatch ?? vi.fn(async () => ({ accepted: 0, deduped: 0 })),
  };
}
