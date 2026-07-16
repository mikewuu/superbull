import type { HelloFrame, RequestFrame, ResponseFrame } from '@superbull/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { type Connector, connect } from '../src/connect';
import { type EventOutbox, createEventOutbox } from '../src/event-outbox';

interface OnceEmitter<T> {
  once: (event: string, cb: (arg: T) => void) => void;
}

function once<T = unknown>(emitter: OnceEmitter<T>, event: string): Promise<T> {
  return new Promise((resolve) => emitter.once(event, resolve));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('connect', () => {
  let server: WebSocketServer;
  let port: number;
  let connector: Connector | undefined;
  let outbox: EventOutbox;

  beforeEach(async () => {
    server = new WebSocketServer({ port: 0, path: '/connect' });
    await once(server, 'listening');
    const address = server.address();
    port = typeof address === 'object' && address ? address.port : 0;
    outbox = createEventOutbox({ flushIntervalMs: 60_000 });
  });

  afterEach(async () => {
    connector?.stop();
    outbox.stop();
    // ws's server.close() waits for existing clients to disconnect before
    // emitting 'close'; force them closed so afterEach never hangs.
    for (const client of server.clients) {
      client.terminate();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('sends hello on open and resends outbox backlog once hello_ack wires transport', async () => {
    // Simulate events that were buffered while disconnected: one unacked
    // batch sitting in the outbox with no transport attached yet.
    outbox.enqueue({
      uuid: 'probe:1-0',
      type: 'job.completed',
      queue_name: 'probe',
      ts: Date.now(),
    });
    outbox.flush();
    expect(outbox.unackedCount()).toBe(1);

    const helloReceived = new Promise<HelloFrame>((resolve) => {
      server.once('connection', (socket) => {
        socket.once('message', (raw) => resolve(JSON.parse(raw.toString())));
      });
    });

    connector = connect({
      url: `ws://127.0.0.1:${port}`,
      token: 'secret-token',
      name: 'worker-1',
      version: '0.0.0',
      queues: ['a', 'b'],
      executeRequest: async (frame) => makeResponse(frame),
      outbox,
    });

    const hello = await helloReceived;
    expect(hello).toMatchObject({
      type: 'hello',
      token: 'secret-token',
      name: 'worker-1',
      version: '0.0.0',
      queues: ['a', 'b'],
      capabilities: [],
    });

    const [gatewaySocket] = [...server.clients];
    const nextMessage = new Promise<{ type: string; events?: unknown[] }>((resolve) => {
      gatewaySocket?.once('message', (raw) => resolve(JSON.parse(raw.toString())));
    });
    gatewaySocket?.send(
      JSON.stringify({ type: 'hello_ack', connector_id: 'conn-1', heartbeat_interval_ms: 15_000 }),
    );

    const eventsFrame = await nextMessage;
    expect(eventsFrame.type).toBe('events');
    expect(eventsFrame.events).toHaveLength(1);
  });

  it('responds to request frames and resolves events_ack against the outbox', async () => {
    connector = connect({
      url: `ws://127.0.0.1:${port}`,
      token: 'secret-token',
      name: 'worker-1',
      version: '0.0.0',
      queues: [],
      executeRequest: async (frame) => makeResponse(frame, { echoed: frame.path }),
      outbox,
    });

    const gatewaySocket = await once<import('ws').WebSocket>(server, 'connection');
    await once(gatewaySocket, 'message'); // hello
    gatewaySocket.send(
      JSON.stringify({ type: 'hello_ack', connector_id: 'conn-1', heartbeat_interval_ms: 15_000 }),
    );

    const requestFrame: RequestFrame = {
      type: 'request',
      id: 'req-1',
      method: 'GET',
      path: ['api', 'queues'],
      search: '',
      body: null,
      content_type: null,
    };

    const responsePromise = new Promise<ResponseFrame>((resolve) => {
      gatewaySocket.once('message', (raw) => resolve(JSON.parse(raw.toString())));
    });
    gatewaySocket.send(JSON.stringify(requestFrame));

    const response = await responsePromise;
    expect(response).toMatchObject({ type: 'response', id: 'req-1', status: 200 });
    expect(JSON.parse(response.body)).toEqual({ echoed: ['api', 'queues'] });
  });

  it('handles concurrent request frames without serializing them', async () => {
    const order: string[] = [];
    connector = connect({
      url: `ws://127.0.0.1:${port}`,
      token: 'secret-token',
      name: 'worker-1',
      version: '0.0.0',
      queues: [],
      executeRequest: async (frame) => {
        if (frame.id === 'slow') {
          await sleep(50);
        }
        order.push(frame.id);
        return makeResponse(frame);
      },
      outbox,
    });

    const gatewaySocket = await once<import('ws').WebSocket>(server, 'connection');
    await once(gatewaySocket, 'message'); // hello
    gatewaySocket.send(
      JSON.stringify({ type: 'hello_ack', connector_id: 'conn-1', heartbeat_interval_ms: 15_000 }),
    );

    const responses: ResponseFrame[] = [];
    const done = new Promise<void>((resolve) => {
      gatewaySocket.on('message', (raw) => {
        responses.push(JSON.parse(raw.toString()));
        if (responses.length === 2) {
          resolve();
        }
      });
    });

    gatewaySocket.send(
      JSON.stringify({
        type: 'request',
        id: 'slow',
        method: 'GET',
        path: [],
        search: '',
        body: null,
        content_type: null,
      } satisfies RequestFrame),
    );
    gatewaySocket.send(
      JSON.stringify({
        type: 'request',
        id: 'fast',
        method: 'GET',
        path: [],
        search: '',
        body: null,
        content_type: null,
      } satisfies RequestFrame),
    );

    await done;
    // the fast request resolves and is responded to before the slow one,
    // proving they were not handled serially.
    expect(order).toEqual(['fast', 'slow']);
    expect(responses.map((response) => response.id)).toEqual(['fast', 'slow']);
  });

  it('reconnects with jittered backoff after the socket closes', async () => {
    // full-jitter floor -> ~0ms delay
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const connections: number[] = [];
    server.on('connection', () => {
      connections.push(Date.now());
    });

    connector = connect({
      url: `ws://127.0.0.1:${port}`,
      token: 'secret-token',
      name: 'worker-1',
      version: '0.0.0',
      queues: [],
      executeRequest: async (frame) => makeResponse(frame),
      outbox,
    });

    await vi.waitFor(() => expect(connections.length).toBeGreaterThanOrEqual(1));

    // simulate a mid-session drop from the gateway side
    for (const client of server.clients) {
      client.close();
    }

    await vi.waitFor(() => expect(connections.length).toBeGreaterThanOrEqual(2), { timeout: 5000 });

    randomSpy.mockRestore();
  });

  it('exits the process without reconnecting on hello_error unauthorized', async () => {
    const exit = vi.fn();
    const connections: number[] = [];
    server.on('connection', (socket) => {
      connections.push(Date.now());
      socket.once('message', () => {
        socket.send(
          JSON.stringify({ type: 'hello_error', code: 'unauthorized', message: 'bad token' }),
        );
      });
    });

    connector = connect({
      url: `ws://127.0.0.1:${port}`,
      token: 'wrong-token',
      name: 'worker-1',
      version: '0.0.0',
      queues: [],
      executeRequest: async (frame) => makeResponse(frame),
      outbox,
      exit,
    });

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

    // give a would-be reconnect a chance to happen, then assert it didn't
    await sleep(200);
    expect(connections.length).toBe(1);
  });

  it('reconnects (rather than exiting) on a non-unauthorized hello_error', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const exit = vi.fn();
    let attempts = 0;
    server.on('connection', (socket) => {
      attempts++;
      socket.once('message', () => {
        socket.send(
          JSON.stringify({ type: 'hello_error', code: 'internal_error', message: 'try again' }),
        );
      });
    });

    connector = connect({
      url: `ws://127.0.0.1:${port}`,
      token: 'secret-token',
      name: 'worker-1',
      version: '0.0.0',
      queues: [],
      executeRequest: async (frame) => makeResponse(frame),
      outbox,
      exit,
    });

    await vi.waitFor(() => expect(attempts).toBeGreaterThanOrEqual(2), { timeout: 5000 });
    expect(exit).not.toHaveBeenCalled();

    randomSpy.mockRestore();
  });
});

function makeResponse(frame: RequestFrame, body: unknown = { ok: true }): ResponseFrame {
  return {
    type: 'response',
    id: frame.id,
    status: 200,
    body: JSON.stringify(body),
    content_type: 'application/json',
  };
}
