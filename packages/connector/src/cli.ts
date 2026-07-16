#!/usr/bin/env node
import { createRequire } from 'node:module';
import { BullMQAdapter } from '@superbull/api';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { connect } from './connect';
import { discoverQueueNames } from './discover-queue-names';
import { createEventOutbox } from './event-outbox';
import { createExecuteRequest } from './execute-request';
import { type CliConfig, parseCliArgs } from './parse-cli-args';
import { buildRedisConnectionOptions } from './redis-connection';
import { startIngest } from './start-ingest';

const require = createRequire(import.meta.url);
const connectorVersion = (require('../package.json') as { version: string }).version;

const helpText = `superbull-connector — outbound WebSocket connector for SuperBull

Usage: superbull-connector --token <enrollment-token> [options]

Options:
  -u, --url <url>               Gateway WebSocket URL (SUPERBULL_URL, default wss://connect.superbull.com)
  -t, --token <token>           Enrollment token (SUPERBULL_TOKEN, required)
  -n, --name <name>             Connector name shown on the hub (SUPERBULL_NAME, default hostname)
      --queues <a,b,c>          Explicit queue names, comma separated (SUPERBULL_QUEUES)
      --prefix <prefix>         Queue key prefix (SUPERBULL_PREFIX, default bull)
  -h, --redis-host <host>       Redis host (REDIS_HOST, default 127.0.0.1)
  -p, --redis-port <port>       Redis port (REDIS_PORT, default 6379)
      --redis-password <pw>    Redis password (REDIS_PASSWORD)
      --redis-db <db>          Redis db index (REDIS_DB)
      --redis-tls               Use TLS for Redis (REDIS_TLS=true)
      --help                    Show this help
`;

async function main(): Promise<void> {
  let config: CliConfig;
  try {
    config = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.stderr.write(helpText);
    process.exit(1);
    return;
  }

  if (config.help) {
    process.stdout.write(helpText);
    return;
  }

  // One shared IORedis command connection for discovery, BullMQ Queue
  // instances, and mutations. maxRetriesPerRequest: null is required by
  // BullMQ for connections it manages internally.
  const redis = new Redis({
    ...buildRedisConnectionOptions(config),
    maxRetriesPerRequest: null,
  });
  redis.on('error', (error) => {
    console.error(`superbull-connector: redis error: ${error.message}`);
  });

  const queueNames = await resolveQueueNames(config, redis);
  if (queueNames.length === 0) {
    console.error(
      `superbull-connector: no queues found under prefix "${config.prefix}" — pass --queues`,
    );
    process.exit(1);
    return;
  }

  const adapters = queueNames.map(
    (name) => new BullMQAdapter(new Queue(name, { connection: redis, prefix: config.prefix })),
  );

  const executeRequest = createExecuteRequest(adapters);
  const outbox = createEventOutbox();

  const ingest = startIngest({
    queues: adapters,
    connection: buildRedisConnectionOptions(config),
    prefix: config.prefix,
    enqueue: (event) => outbox.enqueue(event),
    getLastEventId: (queueName) => outbox.getCursor(queueName),
  });

  await ingest.ready();

  const connector = connect({
    url: config.url,
    token: config.token,
    name: config.name,
    version: connectorVersion,
    queues: queueNames,
    executeRequest,
    outbox,
  });

  console.log(`superbull-connector "${config.name}" connecting to ${config.url}`);
  console.log(`  queues: ${queueNames.join(', ')}`);

  process.on('SIGINT', () => {
    connector.stop();
    ingest
      .stop()
      .catch(() => undefined)
      .finally(() => {
        outbox.stop();
        redis.disconnect();
        process.exit(0);
      });
  });
}

async function resolveQueueNames(config: CliConfig, redis: Redis): Promise<string[]> {
  if (config.queueNames && config.queueNames.length > 0) {
    return config.queueNames;
  }
  return discoverQueueNames({ redis, prefix: config.prefix });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
