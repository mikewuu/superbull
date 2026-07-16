import { loadConfig } from './config';
import { createConvexHubClient } from './convex-hub-client';
import { startGateway } from './start-gateway';

async function main(): Promise<void> {
  const config = loadConfig();
  const hubClient = createConvexHubClient({
    convexUrl: config.convexUrl,
    internalToken: config.convexInternalToken,
  });

  const gateway = await startGateway({
    port: config.port,
    hubClient,
    internalToken: config.gatewayInternalToken,
  });

  console.log(`superbull-gateway: listening on port ${gateway.port}`);

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`superbull-gateway: received ${signal}, shutting down`);
    gateway
      .close()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('superbull-gateway: error during shutdown', error);
        process.exit(1);
      });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('superbull-gateway: fatal startup error', error);
  process.exit(1);
});
