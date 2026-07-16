import { type Server, createServer } from 'node:http';
import { HEARTBEAT_INTERVAL_MS, RPC_TIMEOUT_MS } from '@superbull/protocol';
import { WebSocketServer } from 'ws';
import { handleConnectorConnection } from './handle-connector-connection';
import type { HubClient } from './hub-client';
import { handleInternalRequest } from './internal-api';
import { SessionRegistry } from './session-registry';

const HELLO_TIMEOUT_MS = 10_000;

export interface StartGatewayArgs {
  hubClient: HubClient;
  internalToken: string;
  port?: number;
  host?: string;
  heartbeatIntervalMs?: number;
  rpcTimeoutMs?: number;
  helloTimeoutMs?: number;
}

export interface RunningGateway {
  port: number;
  close: () => Promise<void>;
}

export async function startGateway(args: StartGatewayArgs): Promise<RunningGateway> {
  const {
    hubClient,
    internalToken,
    port = 0,
    host = '0.0.0.0',
    heartbeatIntervalMs = HEARTBEAT_INTERVAL_MS,
    rpcTimeoutMs = RPC_TIMEOUT_MS,
    helloTimeoutMs = HELLO_TIMEOUT_MS,
  } = args;

  if (!internalToken) {
    throw new Error('startGateway requires a non-empty internalToken');
  }

  const registry = new SessionRegistry();
  const wss = new WebSocketServer({ noServer: true });

  const server = createServer((req, res) => {
    handleInternalRequest({ registry, internalToken, rpcTimeoutMs }, req, res).catch((error) => {
      console.error('superbull-gateway: internal request failed', error);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal error' }));
    });
  });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== '/connect') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    handleConnectorConnection({ ws, registry, hubClient, helloTimeoutMs, heartbeatIntervalMs });
  });

  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  if (!address || typeof address !== 'object') {
    throw new Error('gateway server has no address');
  }

  return {
    port: address.port,
    close: () => closeGateway(server, wss),
  };
}

function closeGateway(server: Server, wss: WebSocketServer): Promise<void> {
  return new Promise((resolve, reject) => {
    for (const client of wss.clients) {
      client.close(1001, 'gateway shutting down');
    }
    wss.close(() => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
}
