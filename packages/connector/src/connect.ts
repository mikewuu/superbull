import {
  CONNECTOR_PING_TIMEOUT_MS,
  type HelloFrame,
  type RequestFrame,
  type ResponseFrame,
  parseGatewayFrame,
} from '@superbull/protocol';
import { WebSocket } from 'ws';
import type { EventOutbox } from './event-outbox';

const BACKOFF_BASE_MS = 1000;
const BACKOFF_FACTOR = 2;
const BACKOFF_CAP_MS = 60_000;
const WATCHDOG_CHECK_INTERVAL_MS = 5000;

export interface ConnectOptions {
  url: string;
  token: string;
  name: string;
  version: string;
  queues: string[];
  executeRequest: (frame: RequestFrame) => Promise<ResponseFrame>;
  outbox: EventOutbox;
  onConnectorId?: (connectorId: string) => void;
  /** Injectable for tests: point at a fake WebSocketServer. Defaults to `ws`'s WebSocket. */
  WebSocketImpl?: typeof WebSocket;
  /** Injectable for tests so an unauthorized hello_error doesn't kill the test runner. */
  exit?: (code: number) => void;
}

export interface Connector {
  stop(): void;
}

export function connect(options: ConnectOptions): Connector {
  const WS = options.WebSocketImpl ?? WebSocket;
  const exit = options.exit ?? process.exit.bind(process);
  const wsUrl = `${options.url.replace(/\/+$/, '')}/connect`;

  let stopped = false;
  let attempt = 0;
  let activeSocket: WebSocket | undefined;
  let reconnectTimer: NodeJS.Timeout | undefined;

  function nextDelayMs(): number {
    const cap = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * BACKOFF_FACTOR ** attempt);
    attempt++;
    return Math.random() * cap;
  }

  function scheduleReconnect(): void {
    if (stopped) {
      return;
    }
    const delayMs = nextDelayMs();
    console.log(`superbull-connector: reconnecting in ${(delayMs / 1000).toFixed(1)}s`);
    reconnectTimer = setTimeout(() => {
      dial();
    }, delayMs);
  }

  function dial(): void {
    if (stopped) {
      return;
    }

    const socket = new WS(wsUrl);
    activeSocket = socket;
    let lastPingAt = Date.now();

    const watchdogTimer = setInterval(() => {
      if (Date.now() - lastPingAt > CONNECTOR_PING_TIMEOUT_MS) {
        console.warn('superbull-connector: no ping received in time, reconnecting');
        socket.terminate();
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);

    function handleRequest(frame: RequestFrame): void {
      options
        .executeRequest(frame)
        .then((response) => {
          if (socket.readyState === WS.OPEN) {
            socket.send(JSON.stringify(response));
          }
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : error;
          console.error(`superbull-connector: request handler failed: ${message}`);
        });
    }

    socket.on('open', () => {
      const hello: HelloFrame = {
        type: 'hello',
        token: options.token,
        name: options.name,
        version: options.version,
        queues: options.queues,
        capabilities: [],
      };
      socket.send(JSON.stringify(hello));
    });

    socket.on('ping', () => {
      lastPingAt = Date.now();
    });

    socket.on('message', (data) => {
      const frame = parseGatewayFrame(data.toString());
      if (!frame) {
        return;
      }

      switch (frame.type) {
        case 'hello_ack': {
          console.log(
            `superbull-connector: connected as "${options.name}" (${frame.connector_id})`,
          );
          attempt = 0;
          lastPingAt = Date.now();
          options.onConnectorId?.(frame.connector_id);
          options.outbox.setTransport((eventsFrame) => {
            if (socket.readyState === WS.OPEN) {
              socket.send(JSON.stringify(eventsFrame));
            }
          });
          options.outbox.resendUnacked();
          break;
        }
        case 'hello_error': {
          if (frame.code === 'unauthorized') {
            console.error(`superbull-connector: unauthorized: ${frame.message}`);
            stopped = true;
            socket.close();
            exit(1);
          } else {
            console.error(`superbull-connector: hello failed (${frame.code}): ${frame.message}`);
            socket.close();
          }
          break;
        }
        case 'request': {
          handleRequest(frame);
          break;
        }
        case 'events_ack': {
          options.outbox.ack(frame.batch_id);
          break;
        }
        default:
          break;
      }
    });

    socket.on('close', () => {
      clearInterval(watchdogTimer);
      options.outbox.setTransport(null);
      if (activeSocket === socket) {
        activeSocket = undefined;
      }
      if (!stopped) {
        console.log('superbull-connector: disconnected');
        scheduleReconnect();
      }
    });

    socket.on('error', (error) => {
      console.error(`superbull-connector: socket error: ${error.message}`);
    });
  }

  dial();

  return {
    stop() {
      stopped = true;
      clearTimeout(reconnectTimer);
      options.outbox.setTransport(null);
      activeSocket?.close();
    },
  };
}
