import { hostname } from 'node:os';
import { parseArgs } from 'node:util';

// The hosted gateway (REWRITE_PLAN target architecture). Documented as the
// --url default in the README and docs quickstarts, so a bare
// `npx @superbull/connector --token <token>` connects to the hosted service.
export const DEFAULT_GATEWAY_URL = 'wss://connect.superbull.com';

export interface CliConfig {
  help: boolean;
  url: string;
  token: string;
  name: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string | undefined;
  redisDb: number | undefined;
  redisTls: boolean;
  prefix: string;
  queueNames: string[] | undefined;
}

export function parseCliArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): CliConfig {
  const { values } = parseArgs({
    args: argv,
    options: {
      url: { type: 'string', short: 'u' },
      token: { type: 'string', short: 't' },
      name: { type: 'string', short: 'n' },
      'redis-host': { type: 'string', short: 'h' },
      'redis-port': { type: 'string', short: 'p' },
      'redis-password': { type: 'string' },
      'redis-db': { type: 'string' },
      'redis-tls': { type: 'boolean' },
      prefix: { type: 'string' },
      queues: { type: 'string' },
      help: { type: 'boolean' },
    },
    strict: true,
  });

  const help = values.help === true;
  if (help) {
    return {
      help: true,
      url: '',
      token: '',
      name: '',
      redisHost: '127.0.0.1',
      redisPort: 6379,
      redisPassword: undefined,
      redisDb: undefined,
      redisTls: false,
      prefix: 'bull',
      queueNames: undefined,
    };
  }

  const url = values.url ?? env.SUPERBULL_URL ?? DEFAULT_GATEWAY_URL;

  const token = values.token ?? env.SUPERBULL_TOKEN;
  if (!token) {
    throw new Error(
      'superbull-connector requires an enrollment token (-t/--token or SUPERBULL_TOKEN)',
    );
  }

  return {
    help: false,
    url,
    token,
    name: values.name ?? env.SUPERBULL_NAME ?? hostname(),
    redisHost: values['redis-host'] ?? env.REDIS_HOST ?? '127.0.0.1',
    redisPort: Number(values['redis-port'] ?? env.REDIS_PORT ?? 6379),
    redisPassword: values['redis-password'] ?? env.REDIS_PASSWORD,
    redisDb: parseOptionalInt(values['redis-db'] ?? env.REDIS_DB),
    redisTls: values['redis-tls'] === true || env.REDIS_TLS === 'true',
    prefix: values.prefix ?? env.SUPERBULL_PREFIX ?? 'bull',
    queueNames: resolveQueueNames(values.queues, env.SUPERBULL_QUEUES),
  };
}

function resolveQueueNames(
  queuesFlag: string | undefined,
  queuesEnv: string | undefined,
): string[] | undefined {
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
