import { api } from '../../../convex/_generated/api';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { DeployAnnotation } from './types';

interface DeployAnnotationDoc {
  _id: string;
  connectorId: string;
  label: string;
  ts: number;
}

export async function createDeployAnnotation(args: {
  connectorId: string;
  label: string;
  ts: number;
}): Promise<DeployAnnotation> {
  const client = createServerConvexClient();
  const doc: DeployAnnotationDoc = await client.mutation(api.deployAnnotations.create, args);
  return toDeployAnnotation(doc);
}

function toDeployAnnotation(doc: DeployAnnotationDoc): DeployAnnotation {
  return { id: doc._id, connectorId: doc.connectorId, label: doc.label, ts: doc.ts };
}
