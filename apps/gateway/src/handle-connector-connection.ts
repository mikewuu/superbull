import { type GatewayFrame, parseConnectorFrame } from '@superbull/protocol';
import type { WebSocket } from 'ws';
import { ConnectorDisconnectedError } from './errors';
import type { HubClient } from './hub-client';
import {
  type ConnectorSession,
  type SessionRegistry,
  rejectAllPendingRpc,
} from './session-registry';
import { sha256Hex } from './sha256-hex';

export interface HandleConnectorConnectionArgs {
  ws: WebSocket;
  registry: SessionRegistry;
  hubClient: HubClient;
  helloTimeoutMs: number;
  heartbeatIntervalMs: number;
}

export function handleConnectorConnection(args: HandleConnectorConnectionArgs): void {
  const { ws, registry, hubClient, helloTimeoutMs, heartbeatIntervalMs } = args;

  // Without a listener, a socket error (e.g. ECONNRESET) is an unhandled
  // 'error' event and takes down the whole gateway. 'close' follows and
  // runs the normal cleanup path.
  ws.on('error', (error) => {
    console.error('superbull-gateway: connector socket error', error);
  });

  const helloTimer = setTimeout(() => {
    sendFrame(ws, {
      type: 'hello_error',
      code: 'protocol_error',
      message: 'timed out waiting for hello',
    });
    ws.close(4002, 'hello timeout');
  }, helloTimeoutMs);
  ws.once('close', () => clearTimeout(helloTimer));

  ws.once('message', (raw: Buffer) => {
    clearTimeout(helloTimer);
    handleHello(raw.toString()).catch((error) => {
      console.error('superbull-gateway: hello handling failed', error);
      ws.close(4002, 'internal error');
    });
  });

  async function handleHello(raw: string): Promise<void> {
    const frame = parseConnectorFrame(raw);
    if (!frame || frame.type !== 'hello') {
      sendFrame(ws, {
        type: 'hello_error',
        code: 'protocol_error',
        message: 'expected hello frame',
      });
      ws.close(4002, 'protocol error');
      return;
    }

    let lookup: Awaited<ReturnType<HubClient['findConnectorByTokenHash']>>;
    try {
      lookup = await hubClient.findConnectorByTokenHash(sha256Hex(frame.token));
    } catch (error) {
      console.error('superbull-gateway: connector lookup failed', error);
      sendFrame(ws, { type: 'hello_error', code: 'internal_error', message: 'lookup failed' });
      ws.close(4002, 'internal error');
      return;
    }

    if (!lookup) {
      sendFrame(ws, {
        type: 'hello_error',
        code: 'unauthorized',
        message: 'invalid or unknown enrollment token',
      });
      ws.close(4001, 'unauthorized');
      return;
    }

    const session: ConnectorSession = {
      connectorId: lookup.connectorId,
      workspaceId: lookup.workspaceId,
      name: frame.name,
      version: frame.version,
      queues: frame.queues,
      ws,
      connectedAt: Date.now(),
      pendingRpc: new Map(),
    };

    const previous = registry.set(session);
    previous?.ws.close(4000, 'replaced');

    sendFrame(ws, {
      type: 'hello_ack',
      connector_id: session.connectorId,
      heartbeat_interval_ms: heartbeatIntervalMs,
    });

    hubClient
      .markConnected({
        connectorId: session.connectorId,
        version: session.version,
        queues: session.queues,
      })
      .catch((error) => console.error('superbull-gateway: markConnected failed', error));

    attachSessionHandlers(session);
  }

  function attachSessionHandlers(session: ConnectorSession): void {
    let lastPongAt = Date.now();
    ws.on('pong', () => {
      lastPongAt = Date.now();
    });

    const heartbeat = setInterval(() => {
      if (Date.now() - lastPongAt > heartbeatIntervalMs * 2) {
        ws.terminate();
        return;
      }
      ws.ping();
    }, heartbeatIntervalMs);
    heartbeat.unref?.();

    ws.on('message', (raw: Buffer) => {
      handleFrame(session, raw.toString()).catch((error) => {
        console.error('superbull-gateway: frame handling failed', error);
      });
    });

    ws.on('close', () => {
      clearInterval(heartbeat);
      rejectAllPendingRpc(session, new ConnectorDisconnectedError());
      if (registry.deleteIfCurrent(session)) {
        hubClient
          .markDisconnected({ connectorId: session.connectorId })
          .catch((error) => console.error('superbull-gateway: markDisconnected failed', error));
      }
    });
  }

  async function handleFrame(session: ConnectorSession, raw: string): Promise<void> {
    const frame = parseConnectorFrame(raw);
    if (!frame) {
      return;
    }

    if (frame.type === 'response') {
      const pending = session.pendingRpc.get(frame.id);
      if (!pending) {
        return;
      }
      session.pendingRpc.delete(frame.id);
      pending.resolve({ status: frame.status, body: frame.body, content_type: frame.content_type });
      return;
    }

    if (frame.type === 'events') {
      try {
        await hubClient.recordEventBatch({
          connectorId: session.connectorId,
          events: frame.events,
        });
      } catch (error) {
        console.error('superbull-gateway: recordEventBatch failed', error);
        return;
      }
      sendFrame(ws, { type: 'events_ack', batch_id: frame.batch_id });
    }
  }
}

function sendFrame(ws: WebSocket, frame: GatewayFrame): void {
  ws.send(JSON.stringify(frame));
}
