import { NotFoundException, buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateHubToken } from '../../../../lib/auth/authenticate-hub-token';
import { deleteSource } from '../../../../lib/sources/delete-source';
import { findSourceById } from '../../../../lib/sources/find-source-by-id';

export const DELETE = buildRoute({
  routeParams: z.object({ sourceId: z.string() }),
})
  .use(authenticateHubToken)
  .handle(async (req) => {
    const source = await findSourceById(req.routeParams.sourceId);
    if (!source) {
      throw new NotFoundException({ type: 'source_not_found', message: 'Source not found' });
    }

    await deleteSource(req.routeParams.sourceId);
    return new NextResponse(null, { status: 204 });
  });
