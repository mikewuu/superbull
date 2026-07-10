import { describe, expect, it, vi } from 'vitest';
import { registerWithHub } from '../src/register-with-hub';

describe('registerWithHub', () => {
  it('returns the source id on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ source_id: 'src-1', name: 'a', url: 'http://a' }), {
        status: 201,
      }),
    );

    const result = await registerWithHub({
      hubUrl: 'http://hub.local',
      hubToken: 'hub-token',
      name: 'proxy-a',
      url: 'http://proxy-a.local',
      token: 'proxy-token',
      fetchImpl,
    });

    expect(result).toEqual({ sourceId: 'src-1' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://hub.local/api/sources/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer hub-token' }),
        body: JSON.stringify({
          name: 'proxy-a',
          url: 'http://proxy-a.local',
          token: 'proxy-token',
        }),
      }),
    );
  });

  it('retries on failure and succeeds on a later attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ source_id: 'src-2' }), { status: 201 }));

    const result = await registerWithHub({
      hubUrl: 'http://hub.local',
      hubToken: 'hub-token',
      name: 'proxy-a',
      url: 'http://proxy-a.local',
      token: 'proxy-token',
      fetchImpl,
      retryDelayMs: 1,
    });

    expect(result).toEqual({ sourceId: 'src-2' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('warns and returns null after exhausting retries', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await registerWithHub({
      hubUrl: 'http://hub.local',
      hubToken: 'hub-token',
      name: 'proxy-a',
      url: 'http://proxy-a.local',
      token: 'proxy-token',
      fetchImpl,
      retryDelayMs: 1,
    });

    expect(result).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
