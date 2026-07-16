import { NotFoundException, buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateHubToken } from '../../../../lib/auth/authenticate-hub-token';
import { deleteConnectorLegacy } from '../../../../lib/connectors/delete-connector-legacy';
import { findConnectorByIdLegacy } from '../../../../lib/connectors/find-connector-by-id-legacy';

// TRANSITIONAL — deleted in Round 3. The [sourceId] segment is a connector id.
export const DELETE = buildRoute({
  routeParams: z.object({ sourceId: z.string() }),
})
  .use(authenticateHubToken)
  .handle(async (req) => {
    const connector = await findConnectorByIdLegacy(req.routeParams.sourceId);
    if (!connector) {
      throw new NotFoundException({ type: 'source_not_found', message: 'Source not found' });
    }

    await deleteConnectorLegacy(req.routeParams.sourceId);
    return new NextResponse(null, { status: 204 });
  });
