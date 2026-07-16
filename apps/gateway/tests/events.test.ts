import type { HelloFrame, IngestEvent } from '@superbull/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '../src/sha256-hex';
import { type RunningGateway, startGateway } from '../src/start-gateway';
import {
  connectAndHandshake,
  nextGatewayFrame,
  noFrameWithin,
  sendConnectorFrame,
} from './helpers/fake-connector';
import { createFakeHubClient } from './helpers/fake-hub-client';

const hello: HelloFrame = {
  type: 'hello',
  token: 'good-token',
  name: 'acme-worker',
  version: '1.0.0',
  queues: ['emails'],
  capabilities: [],
};

const event: IngestEvent = {
  uuid: 'evt_1',
  type: 'job.completed',
  queue_name: 'emails',
  ts: Date.now(),
};

describe('events ingest', () => {
  let gateway: RunningGateway | undefined;

  afterEach(async () => {
    await gateway?.close();
    gateway = undefined;
  });

  it('acknowledges a batch after the hub records it', async () => {
    const hubClient = createFakeHubClient({
      lookups: {
        [sha256Hex('good-token')]: { connectorId: 'conn_1', workspaceId: 'ws_1', name: 'Acme' },
      },
    });
    gateway = await startGateway({
      hubClient,
      internalToken: 'internal-secret',
      host: '127.0.0.1',
    });
    const ws = await connectAndHandshake(`ws://127.0.0.1:${gateway.port}/connect`, hello);

    sendConnectorFrame(ws, { type: 'events', batch_id: 'batch_1', events: [event] });
    const ack = await nextGatewayFrame(ws);

    expect(ack).toEqual({ type: 'events_ack', batch_id: 'batch_1' });
    expect(hubClient.recordEventBatch).toHaveBeenCalledWith({
      connectorId: 'conn_1',
      events: [event],
    });

    ws.close();
  });

  it('does not acknowledge a batch when the hub fails to record it', async () => {
    const recordEventBatch = vi.fn(async () => {
      throw new Error('convex unavailable');
    });
    const hubClient = createFakeHubClient({
      lookups: {
        [sha256Hex('good-token')]: { connectorId: 'conn_1', workspaceId: 'ws_1', name: 'Acme' },
      },
      recordEventBatch,
    });
    gateway = await startGateway({
      hubClient,
      internalToken: 'internal-secret',
      host: '127.0.0.1',
    });
    const ws = await connectAndHandshake(`ws://127.0.0.1:${gateway.port}/connect`, hello);

    sendConnectorFrame(ws, { type: 'events', batch_id: 'batch_1', events: [event] });
    const gotNoFrame = await noFrameWithin(ws, 200);

    expect(gotNoFrame).toBe(true);
    expect(recordEventBatch).toHaveBeenCalled();

    ws.close();
  });
});
