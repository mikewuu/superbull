import { buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateHubToken } from '../../../../lib/auth/authenticate-hub-token';
import { upsertSourceByName } from '../../../../lib/sources/upsert-source-by-name';

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
    const source = await upsertSourceByName(req.body);
    return NextResponse.json({ source_id: source.id, name: source.name, url: source.url });
  });
