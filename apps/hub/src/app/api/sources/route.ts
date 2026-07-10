import { buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateHubToken } from '../../../lib/auth/authenticate-hub-token';
import { createSource } from '../../../lib/sources/create-source';
import { listSources } from '../../../lib/sources/list-sources';

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
    const sources = await listSources();
    return NextResponse.json({
      sources: sources.map((source) => ({
        id: source.id,
        name: source.name,
        url: source.url,
        created_at: source.created_at.toISOString(),
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
    const source = await createSource(req.body);
    return NextResponse.json(
      {
        id: source.id,
        name: source.name,
        url: source.url,
        created_at: source.created_at.toISOString(),
      },
      { status: 201 },
    );
  });
