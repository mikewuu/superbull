import type { HelloFrame } from '@superbull/protocol';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256Hex } from '../src/sha256-hex';
import { type RunningGateway, startGateway } from '../src/start-gateway';
import { connectAndHandshake } from './helpers/fake-connector';
import { createFakeHubClient } from './helpers/fake-hub-client';

const hello: HelloFrame = {
  type: 'hello',
  token: 'good-token',
  name: 'acme-worker',
  version: '1.0.0',
  queues: ['emails'],
  capabilities: [],
};

describe('internal http api', () => {
  let gateway: RunningGateway | undefined;

  afterEach(async () => {
    await gateway?.close();
    gateway = undefined;
  });

  async function boot(): Promise<{
    baseUrl: string;
    wsUrl: string;
    hubClient: ReturnType<typeof createFakeHubClient>;
  }> {
    const hubClient = createFakeHubClient({
      lookups: {
        [sha256Hex('good-token')]: { connectorId: 'conn_1', projectId: 'project_1', name: 'Acme' },
      },
    });
    gateway = await startGateway({
      hubClient,
      internalToken: 'internal-secret',
      host: '127.0.0.1',
    });
    return {
      baseUrl: `http://127.0.0.1:${gateway.port}`,
      wsUrl: `ws://127.0.0.1:${gateway.port}/connect`,
      hubClient,
    };
  }

  it('exposes an unauthenticated healthz endpoint', async () => {
    const { baseUrl } = await boot();

    const response = await fetch(`${baseUrl}/healthz`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('rejects protected routes without a valid bearer token', async () => {
    const { baseUrl } = await boot();

    const missing = await fetch(`${baseUrl}/internal/connectors/conn_1/status`);
    expect(missing.status).toBe(401);

    const wrong = await fetch(`${baseUrl}/internal/connectors/conn_1/status`, {
      headers: { authorization: 'Bearer nope' },
    });
    expect(wrong.status).toBe(401);
  });

  it('reports connected status for a live connector', async () => {
    const { baseUrl, wsUrl } = await boot();
    const ws = await connectAndHandshake(wsUrl, hello);

    const response = await fetch(`${baseUrl}/internal/connectors/conn_1/status`, {
      headers: { authorization: 'Bearer internal-secret' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      connected: true,
      connected_at: expect.any(Number),
      name: 'acme-worker',
      version: '1.0.0',
      queues: ['emails'],
    });

    ws.close();
  });

  it('reports disconnected status for an unknown connector', async () => {
    const { baseUrl } = await boot();

    const response = await fetch(`${baseUrl}/internal/connectors/conn_unknown/status`, {
      headers: { authorization: 'Bearer internal-secret' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      connected: false,
      connected_at: null,
      name: null,
      version: null,
      queues: [],
    });
  });
});
