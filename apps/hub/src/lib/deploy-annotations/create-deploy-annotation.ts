import { makeFunctionReference } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { DeployAnnotation } from './types';

const createRef = makeFunctionReference<'mutation'>('deployAnnotations:create');

interface DeployAnnotationDoc {
  _id: string;
  sourceId: string;
  label: string;
  ts: number;
}

export async function createDeployAnnotation(args: {
  sourceId: string;
  label: string;
  ts: number;
}): Promise<DeployAnnotation> {
  const client = createServerConvexClient();
  const doc: DeployAnnotationDoc = await client.mutation(createRef, args);
  return toDeployAnnotation(doc);
}

function toDeployAnnotation(doc: DeployAnnotationDoc): DeployAnnotation {
  return { id: doc._id, sourceId: doc.sourceId, label: doc.label, ts: doc.ts };
}
