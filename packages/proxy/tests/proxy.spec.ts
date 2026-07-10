import { BullMQAdapter } from '@superbull/api';
import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type RunningProxy, startProxy } from '../src/start-proxy';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

describe('startProxy', () => {
  let queue: Queue;
  let proxy: RunningProxy | undefined;

  beforeEach(async () => {
    queue = new Queue('ProxyTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.add('seed-job', { hello: 'world' });
  });

  afterEach(async () => {
    await proxy?.close();
    proxy = undefined;
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  });

  async function boot(token = 'secret-token'): Promise<string> {
    proxy = await startProxy({ queues: [new BullMQAdapter(queue)], token, host: '127.0.0.1' });
    return `http://127.0.0.1:${proxy.port}`;
  }

  it('rejects requests without a valid bearer token', async () => {
    const baseUrl = await boot();

    const missing = await fetch(`${baseUrl}/api/queues`);
    expect(missing.status).toBe(401);

    const wrong = await fetch(`${baseUrl}/api/queues`, {
      headers: { authorization: 'Bearer nope' },
    });
    expect(wrong.status).toBe(401);
  });

  it('serves the queue api with a valid token', async () => {
    const baseUrl = await boot();

    const response = await fetch(`${baseUrl}/api/queues`, {
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { queues: Array<{ name: string }> };
    expect(body.queues.map((entry) => entry.name)).toContain('ProxyTest');
  });

  it('performs mutations through the proxied api', async () => {
    const baseUrl = await boot();

    const response = await fetch(`${baseUrl}/api/queues/ProxyTest/pause`, {
      method: 'PUT',
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(response.status).toBeLessThan(300);
    expect(await queue.isPaused()).toBe(true);
  });

  it('exposes an unauthenticated health endpoint only', async () => {
    const baseUrl = await boot();

    const health = await fetch(`${baseUrl}/healthz`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true });
  });

  it('does not serve any ui entry route', async () => {
    const baseUrl = await boot();

    const entry = await fetch(`${baseUrl}/`, {
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(entry.status).toBe(404);
  });

  it('refuses to start with an empty token', async () => {
    await expect(startProxy({ queues: [new BullMQAdapter(queue)], token: '' })).rejects.toThrow(
      /token/,
    );
  });
});
