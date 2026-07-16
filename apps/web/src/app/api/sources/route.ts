import { buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateHubToken } from '../../../lib/auth/authenticate-hub-token';
import { createConnectorLegacy } from '../../../lib/connectors/create-connector-legacy';
import { listConnectorsLegacy } from '../../../lib/connectors/list-connectors-legacy';

// TRANSITIONAL — deleted in Round 3 along with the rest of the hub-token
// connector API surface. Wire shapes (source_id/sources) stay unchanged this
// round; only the internal connector plumbing changed.
export const GET = buildRoute({
  response: z.object({
    sources: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        created_at: z.string(),
      }),
    ),
  }),
})
  .use(authenticateHubToken)
  .handle(async () => {
    const connectors = await listConnectorsLegacy();
    return NextResponse.json({
      sources: connectors
        .filter((connector) => connector.url !== null)
        .map((connector) => ({
          id: connector.id,
          name: connector.name,
          url: connector.url as string,
          created_at: connector.created_at.toISOString(),
        })),
    });
  });

export const POST = buildRoute({
  body: z.object({
    name: z.string().min(1),
    url: z.string().url(),
    token: z.string().min(1),
  }),
  response: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    created_at: z.string(),
  }),
})
  .use(authenticateHubToken)
  .handle(async (req) => {
    const connector = await createConnectorLegacy(req.body);
    return NextResponse.json(
      {
        id: connector.id,
        name: connector.name,
        url: connector.url as string,
        created_at: connector.created_at.toISOString(),
      },
      { status: 201 },
    );
  });
