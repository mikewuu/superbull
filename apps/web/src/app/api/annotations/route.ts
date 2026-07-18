import { NotFoundException, buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateCaller } from '../../../lib/auth/authenticate-caller';
import { findConnectorByIdForUser } from '../../../lib/connectors/find-connector-by-id-for-user';
import { createDeployAnnotation } from '../../../lib/deploy-annotations/create-deploy-annotation';
import { listDeployAnnotations } from '../../../lib/deploy-annotations/list-deploy-annotations';

export const annotationSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  label: z.string(),
  ts: z.number(),
});

export const getQuerySchema = z.object({
  source_id: z.string(),
  from_ts: z.string().nullable().optional(),
  to_ts: z.string().nullable().optional(),
});

export const getResponseSchema = z.object({ annotations: z.array(annotationSchema) });

export const postBodySchema = z.object({
  source_id: z.string(),
  label: z.string().min(1),
  ts: z.number().nullable(),
});

export const GET = buildRoute({
  query: getQuerySchema,
  response: getResponseSchema,
})
  .use(authenticateCaller)
  .handle(async (req) => {
    const connector = await findConnectorByIdForUser({
      userId: req.userId,
      connectorId: req.query.source_id,
      requiredProjectId: req.projectId,
    });
    if (!connector) {
      throw new NotFoundException({ type: 'not_found', message: 'Connector not found' });
    }
    const annotations = await listDeployAnnotations({
      connectorId: connector.id,
      fromTs: req.query.from_ts ? Number(req.query.from_ts) : undefined,
      toTs: req.query.to_ts ? Number(req.query.to_ts) : undefined,
    });
    return NextResponse.json({
      annotations: annotations.map((annotation) => ({
        id: annotation.id,
        source_id: annotation.connectorId,
        label: annotation.label,
        ts: annotation.ts,
      })),
    });
  });

export const POST = buildRoute({
  body: postBodySchema,
  response: annotationSchema,
})
  .use(authenticateCaller)
  .handle(async (req) => {
    const connector = await findConnectorByIdForUser({
      userId: req.userId,
      connectorId: req.body.source_id,
      requiredProjectId: req.projectId,
    });
    if (!connector) {
      throw new NotFoundException({ type: 'not_found', message: 'Connector not found' });
    }
    const annotation = await createDeployAnnotation({
      connectorId: connector.id,
      label: req.body.label,
      ts: req.body.ts ?? Date.now(),
    });
    return NextResponse.json(
      {
        id: annotation.id,
        source_id: annotation.connectorId,
        label: annotation.label,
        ts: annotation.ts,
      },
      { status: 201 },
    );
  });
