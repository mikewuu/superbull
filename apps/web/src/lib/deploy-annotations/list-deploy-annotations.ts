import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { DeployAnnotation } from './types';

interface DeployAnnotationDoc {
  _id: string;
  connectorId: string;
  label: string;
  ts: number;
}

// TRANSITIONAL — backs GET /api/annotations.
export async function listDeployAnnotations(args: {
  connectorId: string;
  fromTs?: number;
  toTs?: number;
}): Promise<DeployAnnotation[]> {
  const client = createServerConvexClient();
  const docs: DeployAnnotationDoc[] = await client.query(api.deployAnnotations.list, args);
  return docs.map(toDeployAnnotation);
}

function toDeployAnnotation(doc: DeployAnnotationDoc): DeployAnnotation {
  return { id: doc._id, connectorId: doc.connectorId, label: doc.label, ts: doc.ts };
}
