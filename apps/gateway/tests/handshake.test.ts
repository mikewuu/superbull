import type { HelloFrame } from '@superbull/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/sha256-hex';
import { type RunningGateway, startGateway } from '../src/start-gateway';
import {
  connectFakeConnector,
  nextClose,
  nextGatewayFrame,
  sendConnectorFrame,
} from './helpers/fake-connector';
import { createFakeHubClient } from './helpers/fake-hub-client';

describe('connector handshake', () => {
  let gateway: RunningGateway | undefined;

  afterEach(async () => {
    await gateway?.close();
    gateway = undefined;
  });

  function helloFrame(overrides: Partial<HelloFrame> = {}): HelloFrame {
    return {
      type: 'hello',
      token: 'good-token',
      name: 'acme-worker',
      version: '1.0.0',
      queues: ['emails'],
      capabilities: [],
      ...overrides,
    };
  }

  it('completes the handshake and acks with the connector id', async () => {
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

    const ws = await connectFakeConnector(`ws://127.0.0.1:${gateway.port}/connect`);
    sendConnectorFrame(ws, helloFrame());
    const frame = await nextGatewayFrame(ws);

    expect(frame).toEqual({
      type: 'hello_ack',
      connector_id: 'conn_1',
      heartbeat_interval_ms: expect.any(Number),
    });
    expect(hubClient.markConnected).toHaveBeenCalledWith({
      connectorId: 'conn_1',
      version: '1.0.0',
      queues: ['emails'],
    });

    ws.close();
  });

  it('rejects an unknown token with hello_error and closes without a reconnect signal', async () => {
    const hubClient = createFakeHubClient();
    gateway = await startGateway({
      hubClient,
      internalToken: 'internal-secret',
      host: '127.0.0.1',
    });

    const ws = await connectFakeConnector(`ws://127.0.0.1:${gateway.port}/connect`);
    const closePromise = nextClose(ws);
    sendConnectorFrame(ws, helloFrame({ token: 'bad-token' }));
    const frame = await nextGatewayFrame(ws);

    expect(frame).toEqual({
      type: 'hello_error',
      code: 'unauthorized',
      message: expect.any(String),
    });
    expect(hubClient.markConnected).not.toHaveBeenCalled();

    const closed = await closePromise;
    expect(closed.code).toBe(4001);
  });

  it('replaces the previous session when the same connector reconnects', async () => {
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
    const url = `ws://127.0.0.1:${gateway.port}/connect`;

    const first = await connectFakeConnector(url);
    const firstClosePromise = nextClose(first);
    sendConnectorFrame(first, helloFrame());
    await nextGatewayFrame(first);

    const second = await connectFakeConnector(url);
    sendConnectorFrame(second, helloFrame());
    const secondAck = await nextGatewayFrame(second);

    expect(secondAck).toMatchObject({ type: 'hello_ack', connector_id: 'conn_1' });
    const firstClosed = await firstClosePromise;
    expect(firstClosed.code).toBe(4000);

    second.close();
  });
});
