import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../src/parse-cli-args';

describe('parseCliArgs', () => {
  it('parses flags', () => {
    const config = parseCliArgs([
      '--name',
      'worker-1',
      '--token',
      'secret',
      '--port',
      '5000',
      '--redis-host',
      'redis.internal',
      '--redis-port',
      '6380',
      '--redis-password',
      'pw',
      '--redis-db',
      '2',
      '--tls',
      '--prefix',
      'myprefix',
      '--queues',
      'a,b,c',
      '--hub',
      'http://hub.local',
      '--hub-token',
      'hub-secret',
      '--advertise-url',
      'http://public.local:5000',
    ]);

    expect(config).toMatchObject({
      help: false,
      name: 'worker-1',
      token: 'secret',
      port: 5000,
      redisHost: 'redis.internal',
      redisPort: 6380,
      redisPassword: 'pw',
      redisDb: 2,
      redisTls: true,
      prefix: 'myprefix',
      queueNames: ['a', 'b', 'c'],
      hubUrl: 'http://hub.local',
      hubToken: 'hub-secret',
      advertiseUrl: 'http://public.local:5000',
      ingest: true,
    });
  });

  it('falls back to env vars', () => {
    const config = parseCliArgs([], {
      BULLWATCH_NAME: 'env-name',
      BULLWATCH_TOKEN: 'env-token',
      BULLWATCH_PORT: '4700',
      REDIS_HOST: 'env-host',
      REDIS_PORT: '6390',
      REDIS_PASSWORD: 'env-pw',
      REDIS_DB: '3',
      REDIS_TLS: 'true',
      BULLWATCH_PREFIX: 'env-prefix',
      BULLWATCH_QUEUES: 'x,y',
      BULLWATCH_HUB_URL: 'http://env-hub.local',
      BULLWATCH_HUB_TOKEN: 'env-hub-token',
    });

    expect(config).toMatchObject({
      name: 'env-name',
      token: 'env-token',
      port: 4700,
      redisHost: 'env-host',
      redisPort: 6390,
      redisPassword: 'env-pw',
      redisDb: 3,
      redisTls: true,
      prefix: 'env-prefix',
      queueNames: ['x', 'y'],
      hubUrl: 'http://env-hub.local',
      hubToken: 'env-hub-token',
    });
  });

  it('defaults name to the hostname when unset', () => {
    const config = parseCliArgs(['--token', 'secret'], {});
    expect(config.name.length).toBeGreaterThan(0);
    expect(config.port).toBe(4650);
    expect(config.redisHost).toBe('127.0.0.1');
    expect(config.redisPort).toBe(6379);
    expect(config.prefix).toBe('bull');
    expect(config.queueNames).toBeUndefined();
  });

  it('reads queue names from a queues file, newline separated', () => {
    const file = join(tmpdir(), `bullwatch-queues-${Date.now()}.txt`);
    writeFileSync(file, 'alpha\nbeta:custom-prefix\n\ngamma\n');

    const config = parseCliArgs(['--token', 'secret', '--queues-file', file], {});
    expect(config.queueNames).toEqual(['alpha', 'beta:custom-prefix', 'gamma']);
  });

  it('supports customprefix:name syntax in --queues', () => {
    const config = parseCliArgs(
      ['--token', 'secret', '--queues', 'default-name,custom:renamed'],
      {},
    );
    expect(config.queueNames).toEqual(['default-name', 'custom:renamed']);
  });

  it('throws when no token is provided', () => {
    expect(() => parseCliArgs([], {})).toThrow(/token/);
  });

  it('does not require a token when --help is passed', () => {
    const config = parseCliArgs(['--help'], {});
    expect(config.help).toBe(true);
  });

  it('supports --no-ingest', () => {
    const config = parseCliArgs(['--token', 'secret', '--no-ingest'], {});
    expect(config.ingest).toBe(false);
  });
});
