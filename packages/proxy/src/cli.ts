#!/usr/bin/env node
import { hostname } from 'node:os';
import { BullMQAdapter } from '@superbull/api';
import { Queue } from 'bullmq';
import { createIngestBatcher } from './create-ingest-batcher';
import { discoverQueueNames } from './discover-queue-names';
import { type CliConfig, parseCliArgs } from './parse-cli-args';
import { registerWithHub } from './register-with-hub';
import { startIngestLoop } from './start-ingest-loop';
import { startProxy } from './start-proxy';

const helpText = `superbull-proxy — headless superbull agent

Usage: superbull-proxy --token <token> [options]

Options:
  -n, --name <name>            Proxy name shown on the hub (SUPERBULL_NAME, default hostname)
  -t, --token <token>          Bearer token clients must present (SUPERBULL_TOKEN, required)
      --port <port>            Proxy port (SUPERBULL_PORT, default 4650)
  -h, --redis-host <host>      Redis host (REDIS_HOST, default 127.0.0.1)
  -p, --redis-port <port>      Redis port (REDIS_PORT, default 6379)
      --redis-password <pw>    Redis password (REDIS_PASSWORD)
      --redis-db <db>          Redis db index (REDIS_DB)
      --tls                    Use TLS for Redis (REDIS_TLS=true)
      --prefix <prefix>        Queue key prefix (SUPERBULL_PREFIX, default bull)
      --queues <a,b,c>         Explicit queue names, comma separated (SUPERBULL_QUEUES)
      --queues-file <path>     Newline-separated queue names file
      --hub <url>              Hub URL to register with (SUPERBULL_HUB_URL)
      --hub-token <token>      Hub bearer token (SUPERBULL_HUB_TOKEN)
      --advertise-url <url>    URL advertised to the hub instead of the local hostname
      --no-ingest               Disable outbound event ingest even when a hub is configured
      --help                    Show this help
`;

async function main(): Promise<void> {
  const config = parseCliArgs(process.argv.slice(2));
  if (config.help) {
    process.stdout.write(helpText);
    return;
  }

  const queueNames = await resolveQueueNames(config);
  const queues = queueNames.map(
    (name) =>
      new BullMQAdapter(
        new Queue(name, { connection: buildBullmqConnection(config), prefix: config.prefix }),
      ),
  );

  const proxy = await startProxy({ queues, token: config.token, port: config.port });
  const hubStatus = await connectToHub(config, queues, proxy.port);

  logStartupSummary(config, queueNames, proxy.port, hubStatus);

  process.on('SIGINT', () => {
    hubStatus?.ingestLoop?.stop();
    hubStatus?.batcher?.stop();
    proxy.close().finally(() => process.exit(0));
  });
}

function buildBullmqConnection(config: CliConfig) {
  return {
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    db: config.redisDb,
    tls: config.redisTls ? {} : undefined,
  };
}

async function resolveQueueNames(config: CliConfig): Promise<string[]> {
  if (config.queueNames && config.queueNames.length > 0) {
    return config.queueNames;
  }
  const discovered = await discoverQueueNames({
    connection: {
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
      db: config.redisDb,
      tls: config.redisTls,
    },
    prefix: config.prefix,
  });
  if (discovered.length === 0) {
    throw new Error(
      `no queues found under prefix "${config.prefix}" — pass --queues or --queues-file`,
    );
  }
  return discovered;
}

interface HubStatus {
  registered: boolean;
  sourceId?: string;
  ingestLoop?: ReturnType<typeof startIngestLoop>;
  batcher?: ReturnType<typeof createIngestBatcher>;
}

async function connectToHub(
  config: CliConfig,
  queues: BullMQAdapter[],
  port: number,
): Promise<HubStatus | undefined> {
  if (!config.hubUrl || !config.hubToken) {
    return undefined;
  }

  const advertisedUrl = config.advertiseUrl ?? `http://${hostname()}:${port}`;
  const registration = await registerWithHub({
    hubUrl: config.hubUrl,
    hubToken: config.hubToken,
    name: config.name,
    url: advertisedUrl,
    token: config.token,
  });

  if (!registration) {
    return { registered: false };
  }
  if (!config.ingest) {
    return { registered: true, sourceId: registration.sourceId };
  }

  const batcher = createIngestBatcher({
    hubUrl: config.hubUrl,
    sourceId: registration.sourceId,
    sourceToken: config.token,
  });
  const ingestLoop = startIngestLoop({ queues, batcher });

  return { registered: true, sourceId: registration.sourceId, ingestLoop, batcher };
}

function logStartupSummary(
  config: CliConfig,
  queueNames: string[],
  port: number,
  hubStatus: HubStatus | undefined,
): void {
  console.log(`superbull-proxy "${config.name}" listening on :${port}`);
  console.log(`  queues: ${queueNames.join(', ')}`);
  if (!config.hubUrl) {
    console.log('  hub: not configured');
  } else if (hubStatus?.registered) {
    console.log(`  hub: registered with ${config.hubUrl} (source ${hubStatus.sourceId})`);
    console.log(`  ingest: ${hubStatus.ingestLoop ? 'enabled' : 'disabled'}`);
  } else {
    console.log(`  hub: failed to register with ${config.hubUrl}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
