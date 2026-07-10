import { afterEach, describe, expect, it, vi } from 'vitest';
import { forwardToProxy } from '../src/lib/forwarding/forward-to-proxy';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('forwardToProxy', () => {
  it('builds the upstream url including the search string and sends the bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ queues: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await forwardToProxy({
      source: { url: 'https://proxy.example.com', token: 'secret' },
      method: 'GET',
      path: ['queues'],
      search: '?active_queue=jobs',
      body: undefined,
      contentType: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example.com/api/queues?active_queue=jobs',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer secret' }),
      }),
    );
    expect(result.status).toBe(200);
    expect(result.contentType).toBe('application/json');
    expect(JSON.parse(result.body)).toEqual({ queues: [] });
  });

  it('passes body and content-type through for non-GET requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await forwardToProxy({
      source: { url: 'https://proxy.example.com', token: 'secret' },
      method: 'PUT',
      path: ['queues', 'jobs', 'pause'],
      search: '',
      body: JSON.stringify({ foo: 'bar' }),
      contentType: 'application/json',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example.com/api/queues/jobs/pause',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ foo: 'bar' }),
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      }),
    );
  });

  it('passes the upstream status through unchanged', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await forwardToProxy({
      source: { url: 'https://proxy.example.com', token: 'secret' },
      method: 'GET',
      path: ['queues', 'missing'],
      search: '',
      body: undefined,
      contentType: null,
    });

    expect(result.status).toBe(404);
  });

  it('returns a 502 shape when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const result = await forwardToProxy({
      source: { url: 'https://proxy.example.com', token: 'secret' },
      method: 'GET',
      path: ['queues'],
      search: '',
      body: undefined,
      contentType: null,
    });

    expect(result.status).toBe(502);
    expect(JSON.parse(result.body)).toEqual({ error: 'proxy unreachable' });
  });
});
