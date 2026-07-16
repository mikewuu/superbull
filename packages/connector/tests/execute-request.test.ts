import { BullMQAdapter } from '@superbull/api';
import type { RequestFrame } from '@superbull/protocol';
import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createExecuteRequest } from '../src/execute-request';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

type FrameOverrides = Partial<RequestFrame> & Pick<RequestFrame, 'method' | 'path'>;

function makeFrame(overrides: FrameOverrides): RequestFrame {
  return {
    type: 'request',
    id: overrides.id ?? 'req-1',
    method: overrides.method,
    path: overrides.path,
    search: overrides.search ?? '',
    body: overrides.body ?? null,
    content_type: overrides.content_type ?? null,
  };
}

describe('createExecuteRequest', () => {
  let queue: Queue;

  beforeEach(async () => {
    queue = new Queue('ConnectorExecuteRequestTest', { connection });
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.add('seed-job', { hello: 'world' });
  });

  afterEach(async () => {
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close().catch(() => undefined);
  });

  it('routes a GET request to the matching handler', async () => {
    const executeRequest = createExecuteRequest([new BullMQAdapter(queue)]);

    const response = await executeRequest(makeFrame({ method: 'GET', path: ['api', 'queues'] }));

    expect(response.status).toBe(200);
    expect(response.id).toBe('req-1');
    expect(response.content_type).toBe('application/json');
    const body = JSON.parse(response.body) as { queues: Array<{ name: string }> };
    expect(body.queues.map((entry) => entry.name)).toContain('ConnectorExecuteRequestTest');
  });

  it('performs mutations through the executed frame', async () => {
    const executeRequest = createExecuteRequest([new BullMQAdapter(queue)]);

    const response = await executeRequest(
      makeFrame({ method: 'PUT', path: ['api', 'queues', 'ConnectorExecuteRequestTest', 'pause'] }),
    );

    expect(response.status).toBeLessThan(300);
    expect(await queue.isPaused()).toBe(true);
  });

  it('parses a JSON string body and tolerates garbage bodies', async () => {
    const executeRequest = createExecuteRequest([new BullMQAdapter(queue)]);

    const good = await executeRequest(
      makeFrame({
        method: 'POST',
        path: ['api', 'queues', 'ConnectorExecuteRequestTest', 'add'],
        body: JSON.stringify({ name: 'added-job', data: { x: 1 }, options: null }),
        content_type: 'application/json',
      }),
    );
    expect(good.status).toBeLessThan(300);

    const garbage = await executeRequest(
      makeFrame({
        method: 'POST',
        path: ['api', 'queues', 'ConnectorExecuteRequestTest', 'add'],
        body: 'not json{{{',
      }),
    );
    // tolerated as an empty body rather than throwing/500ing
    expect(garbage.status).not.toBe(500);
  });

  it('returns 404 for an unmatched route', async () => {
    const executeRequest = createExecuteRequest([new BullMQAdapter(queue)]);

    const response = await executeRequest(makeFrame({ method: 'GET', path: ['nope'] }));

    expect(response.status).toBe(404);
    expect(JSON.parse(response.body)).toEqual({ error: 'route not found' });
  });

  it('maps a thrown adapter error to a structured 500 via the error handler', async () => {
    const executeRequest = createExecuteRequest([new BullMQAdapter(queue)]);
    await queue.close();

    const response = await executeRequest(makeFrame({ method: 'GET', path: ['api', 'queues'] }));

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body) as { error: string; message: string };
    expect(body.error).toBe('internal server error');
    expect(body.message.length).toBeGreaterThan(0);
  });
});
