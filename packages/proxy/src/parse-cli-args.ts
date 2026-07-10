import { readFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { parseArgs } from 'node:util';

export interface CliConfig {
  help: boolean;
  name: string;
  token: string;
  port: number;
  redisHost: string;
  redisPort: number;
  redisPassword: string | undefined;
  redisDb: number | undefined;
  redisTls: boolean;
  prefix: string;
  queueNames: string[] | undefined;
  hubUrl: string | undefined;
  hubToken: string | undefined;
  advertiseUrl: string | undefined;
  ingest: boolean;
}

export function parseCliArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): CliConfig {
  const { values } = parseArgs({
    args: argv,
    options: {
      name: { type: 'string', short: 'n' },
      token: { type: 'string', short: 't' },
      port: { type: 'string' },
      'redis-host': { type: 'string', short: 'h' },
      'redis-port': { type: 'string', short: 'p' },
      'redis-password': { type: 'string' },
      'redis-db': { type: 'string' },
      tls: { type: 'boolean' },
      prefix: { type: 'string' },
      queues: { type: 'string' },
      'queues-file': { type: 'string' },
      hub: { type: 'string' },
      'hub-token': { type: 'string' },
      'advertise-url': { type: 'string' },
      'no-ingest': { type: 'boolean' },
      help: { type: 'boolean' },
    },
    strict: true,
  });

  const help = values.help === true;
  if (help) {
    return {
      help: true,
      name: '',
      token: '',
      port: 4650,
      redisHost: '127.0.0.1',
      redisPort: 6379,
      redisPassword: undefined,
      redisDb: undefined,
      redisTls: false,
      prefix: 'bull',
      queueNames: undefined,
      hubUrl: undefined,
      hubToken: undefined,
      advertiseUrl: undefined,
      ingest: true,
    };
  }

  const token = values.token ?? env.BULLWATCH_TOKEN;
  if (!token) {
    throw new Error('bullwatch-proxy requires a token (-t/--token or BULLWATCH_TOKEN)');
  }

  return {
    help: false,
    name: values.name ?? env.BULLWATCH_NAME ?? hostname(),
    token,
    port: Number(values.port ?? env.BULLWATCH_PORT ?? 4650),
    redisHost: values['redis-host'] ?? env.REDIS_HOST ?? '127.0.0.1',
    redisPort: Number(values['redis-port'] ?? env.REDIS_PORT ?? 6379),
    redisPassword: values['redis-password'] ?? env.REDIS_PASSWORD,
    redisDb: parseOptionalInt(values['redis-db'] ?? env.REDIS_DB),
    redisTls: values.tls === true || env.REDIS_TLS === 'true',
    prefix: values.prefix ?? env.BULLWATCH_PREFIX ?? 'bull',
    queueNames: resolveQueueNames(values.queues, values['queues-file'], env.BULLWATCH_QUEUES),
    hubUrl: values.hub ?? env.BULLWATCH_HUB_URL,
    hubToken: values['hub-token'] ?? env.BULLWATCH_HUB_TOKEN,
    advertiseUrl: values['advertise-url'],
    ingest: values['no-ingest'] !== true,
  };
}

function resolveQueueNames(
  queuesFlag: string | undefined,
  queuesFileFlag: string | undefined,
  queuesEnv: string | undefined,
): string[] | undefined {
  if (queuesFileFlag) {
    return splitQueueList(readFileSync(queuesFileFlag, 'utf8').split('\n').join(','));
  }
  if (queuesFlag) {
    return splitQueueList(queuesFlag);
  }
  if (queuesEnv) {
    return splitQueueList(queuesEnv);
  }
  return undefined;
}

function splitQueueList(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseOptionalInt(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  return Number(raw);
}
