import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import { toStatusPageConfig } from './to-status-page-config';
import type { StatusPageConfig } from './types';

// TRANSITIONAL — internalToken-gated, for scripts/dev tooling with no
// Convex Auth session (see src/scripts/seed-status-page.ts).
export async function upsertStatusPageConfigLegacy(args: {
  connectorId: string;
  slug: string;
  isEnabled: boolean;
  title: string;
  queueNames?: string[];
}): Promise<StatusPageConfig> {
  const client = createServerConvexClient();
  const doc = await client.mutation(api.statusPages.upsertLegacy, {
    ...args,
    connectorId: args.connectorId as Id<'connectors'>,
  });
  return toStatusPageConfig(doc);
}
