import { buildRoute } from '@nextastic/http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateHubToken } from '../../../lib/auth/authenticate-hub-token';
import { createDeployAnnotation } from '../../../lib/deploy-annotations/create-deploy-annotation';
import { listDeployAnnotations } from '../../../lib/deploy-annotations/list-deploy-annotations';

const annotationSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  label: z.string(),
  ts: z.number(),
});

// TRANSITIONAL — global SUPERBULL_API_TOKEN hub API. Round 3 gives this
// per-project API keys. `source_id` on the wire is a connector id.
export const GET = buildRoute({
  query: z.object({
    source_id: z.string(),
    from_ts: z.string().nullable().optional(),
    to_ts: z.string().nullable().optional(),
  }),
  response: z.object({ annotations: z.array(annotationSchema) }),
})
  .use(authenticateHubToken)
  .handle(async (req) => {
    const annotations = await listDeployAnnotations({
      connectorId: req.query.source_id,
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
  body: z.object({
    source_id: z.string(),
    label: z.string().min(1),
    ts: z.number().nullable(),
  }),
  response: annotationSchema,
})
  .use(authenticateHubToken)
  .handle(async (req) => {
    const annotation = await createDeployAnnotation({
      connectorId: req.body.source_id,
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
