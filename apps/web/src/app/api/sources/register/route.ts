import { buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateHubToken } from '../../../../lib/auth/authenticate-hub-token';
import { upsertConnectorByName } from '../../../../lib/connectors/upsert-connector-by-name';

// TRANSITIONAL — deleted in Round 3. Registers/updates a connector by name,
// attached to the oldest workspace in the db (see
// convex/connectors.ts's upsertByName for the actual attach logic).
export const POST = buildRoute({
  body: z.object({
    name: z.string().min(1),
    url: z.string().url(),
    token: z.string().min(1),
  }),
  response: z.object({
    source_id: z.string(),
    name: z.string(),
    url: z.string(),
  }),
})
  .use(authenticateHubToken)
  .handle(async (req) => {
    const connector = await upsertConnectorByName(req.body);
    return NextResponse.json({
      source_id: connector.id,
      name: connector.name,
      url: connector.url as string,
    });
  });
