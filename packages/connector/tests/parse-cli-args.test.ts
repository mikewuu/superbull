import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../src/parse-cli-args';

describe('parseCliArgs', () => {
  it('parses flags', () => {
    const config = parseCliArgs([
      '--url',
      'wss://connect.superbull.com',
      '--token',
      'secret',
      '--name',
      'worker-1',
      '--redis-host',
      'redis.internal',
      '--redis-port',
      '6380',
      '--redis-password',
      'pw',
      '--redis-db',
      '2',
      '--redis-tls',
      '--prefix',
      'myprefix',
      '--queues',
      'a,b,c',
    ]);

    expect(config).toMatchObject({
      help: false,
      url: 'wss://connect.superbull.com',
      token: 'secret',
      name: 'worker-1',
      redisHost: 'redis.internal',
      redisPort: 6380,
      redisPassword: 'pw',
      redisDb: 2,
      redisTls: true,
      prefix: 'myprefix',
      queueNames: ['a', 'b', 'c'],
    });
  });

  it('falls back to env vars', () => {
    const config = parseCliArgs([], {
      SUPERBULL_URL: 'wss://env-hub.local',
      SUPERBULL_TOKEN: 'env-token',
      SUPERBULL_NAME: 'env-name',
      REDIS_HOST: 'env-host',
      REDIS_PORT: '6390',
      REDIS_PASSWORD: 'env-pw',
      REDIS_DB: '3',
      REDIS_TLS: 'true',
      SUPERBULL_PREFIX: 'env-prefix',
      SUPERBULL_QUEUES: 'x,y',
    });

    expect(config).toMatchObject({
      url: 'wss://env-hub.local',
      token: 'env-token',
      name: 'env-name',
      redisHost: 'env-host',
      redisPort: 6390,
      redisPassword: 'env-pw',
      redisDb: 3,
      redisTls: true,
      prefix: 'env-prefix',
      queueNames: ['x', 'y'],
    });
  });

  it('defaults name to the hostname when unset', () => {
    const config = parseCliArgs(['--url', 'wss://hub.local', '--token', 'secret'], {});
    expect(config.name.length).toBeGreaterThan(0);
    expect(config.redisHost).toBe('127.0.0.1');
    expect(config.redisPort).toBe(6379);
    expect(config.prefix).toBe('bull');
    expect(config.queueNames).toBeUndefined();
  });

  it('passes queue names containing colons through the comma split verbatim', () => {
    const config = parseCliArgs(
      ['--url', 'wss://hub.local', '--token', 'secret', '--queues', 'default-name,custom:renamed'],
      {},
    );
    expect(config.queueNames).toEqual(['default-name', 'custom:renamed']);
  });

  it('throws when no url is provided', () => {
    expect(() => parseCliArgs(['--token', 'secret'], {})).toThrow(/url/);
  });

  it('throws when no token is provided', () => {
    expect(() => parseCliArgs(['--url', 'wss://hub.local'], {})).toThrow(/token/);
  });

  it('does not require a url or token when --help is passed', () => {
    const config = parseCliArgs(['--help'], {});
    expect(config.help).toBe(true);
  });

  it('rejects removed proxy flags', () => {
    expect(() =>
      parseCliArgs(['--url', 'wss://hub.local', '--token', 'secret', '--port', '5000'], {}),
    ).toThrow();
    expect(() =>
      parseCliArgs(['--url', 'wss://hub.local', '--token', 'secret', '--hub-token', 'x'], {}),
    ).toThrow();
    expect(() =>
      parseCliArgs(
        ['--url', 'wss://hub.local', '--token', 'secret', '--advertise-url', 'http://x'],
        {},
      ),
    ).toThrow();
  });
});
