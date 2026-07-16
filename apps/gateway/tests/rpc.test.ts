import type { HelloFrame } from '@superbull/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/sha256-hex';
import { type RunningGateway, startGateway } from '../src/start-gateway';
import { autoRespond, connectAndHandshake } from './helpers/fake-connector';
import { createFakeHubClient } from './helpers/fake-hub-client';

const hello: HelloFrame = {
  type: 'hello',
  token: 'good-token',
  name: 'acme-worker',
  version: '1.0.0',
  queues: ['emails'],
  capabilities: [],
};

describe('internal rpc api', () => {
  let gateway: RunningGateway | undefined;

  afterEach(async () => {
    await gateway?.close();
    gateway = undefined;
  });

  async function boot(): Promise<{ baseUrl: string; wsUrl: string }> {
    const hubClient = createFakeHubClient({
      lookups: {
        [sha256Hex('good-token')]: { connectorId: 'conn_1', workspaceId: 'ws_1', name: 'Acme' },
      },
    });
    gateway = await startGateway({
      hubClient,
      internalToken: 'internal-secret',
      host: '127.0.0.1',
      rpcTimeoutMs: 200,
    });
    return {
      baseUrl: `http://127.0.0.1:${gateway.port}`,
      wsUrl: `ws://127.0.0.1:${gateway.port}/connect`,
    };
  }

  it('round trips a request through the connected connector', async () => {
    const { baseUrl, wsUrl } = await boot();
    const ws = await connectAndHandshake(wsUrl, hello);
    autoRespond(ws, (request) => ({
      status: 200,
      body: JSON.stringify({ echoedMethod: request.method }),
      content_type: 'application/json',
    }));

    const response = await fetch(`${baseUrl}/internal/rpc`, {
      method: 'POST',
      headers: { authorization: 'Bearer internal-secret', 'content-type': 'application/json' },
      body: JSON.stringify({
        connector_id: 'conn_1',
        method: 'GET',
        path: ['api', 'queues'],
        search: '',
        body: null,
        content_type: null,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: 200,
      body: JSON.stringify({ echoedMethod: 'GET' }),
      content_type: 'application/json',
    });

    ws.close();
  });

  it('returns 502 when the connector has no live session', async () => {
    const { baseUrl } = await boot();

    const response = await fetch(`${baseUrl}/internal/rpc`, {
      method: 'POST',
      headers: { authorization: 'Bearer internal-secret', 'content-type': 'application/json' },
      body: JSON.stringify({
        connector_id: 'conn_unknown',
        method: 'GET',
        path: ['api', 'queues'],
        search: '',
        body: null,
        content_type: null,
      }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'connector disconnected' });
  });

  it('returns 504 when the connector never responds', async () => {
    const { baseUrl, wsUrl } = await boot();
    const ws = await connectAndHandshake(wsUrl, hello);

    const response = await fetch(`${baseUrl}/internal/rpc`, {
      method: 'POST',
      headers: { authorization: 'Bearer internal-secret', 'content-type': 'application/json' },
      body: JSON.stringify({
        connector_id: 'conn_1',
        method: 'GET',
        path: ['api', 'queues'],
        search: '',
        body: null,
        content_type: null,
      }),
    });

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: 'connector timeout' });

    ws.close();
  });

  it('rejects requests without a valid bearer token', async () => {
    const { baseUrl } = await boot();

    const missing = await fetch(`${baseUrl}/internal/rpc`, { method: 'POST' });
    expect(missing.status).toBe(401);

    const wrong = await fetch(`${baseUrl}/internal/rpc`, {
      method: 'POST',
      headers: { authorization: 'Bearer nope' },
    });
    expect(wrong.status).toBe(401);
  });
});
