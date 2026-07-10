import { env } from '../config/env';
import { createConvexHubDatabase } from './convex-hub-database';
import type { HubDatabase } from './hub-database';
import { createMemoryHubDatabase } from './memory-hub-database';
import { createPostgresHubDatabase } from './postgres-hub-database';

let hubDatabase: HubDatabase | undefined;

export function getHubDatabase(): HubDatabase {
  if (hubDatabase) {
    return hubDatabase;
  }

  if (env.HUB_DATABASE === 'memory') {
    hubDatabase = createMemoryHubDatabase();
    return hubDatabase;
  }

  if (env.HUB_DATABASE === 'postgres') {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required when HUB_DATABASE=postgres');
    }
    hubDatabase = createPostgresHubDatabase();
    return hubDatabase;
  }

  if (!env.NEXT_PUBLIC_CONVEX_URL || !env.CONVEX_INTERNAL_TOKEN) {
    throw new Error(
      'NEXT_PUBLIC_CONVEX_URL and CONVEX_INTERNAL_TOKEN are required when HUB_DATABASE=convex',
    );
  }
  hubDatabase = createConvexHubDatabase();
  return hubDatabase;
}
