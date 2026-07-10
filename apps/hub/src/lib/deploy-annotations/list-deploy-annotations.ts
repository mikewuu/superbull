import { makeFunctionReference } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';
import type { DeployAnnotation } from './types';

const listRef = makeFunctionReference<'query'>('deployAnnotations:list');

interface DeployAnnotationDoc {
  _id: string;
  sourceId: string;
  label: string;
  ts: number;
}

export async function listDeployAnnotations(args: {
  sourceId: string;
  fromTs?: number;
  toTs?: number;
}): Promise<DeployAnnotation[]> {
  const client = createServerConvexClient();
  const docs: DeployAnnotationDoc[] = await client.query(listRef, args);
  return docs.map(toDeployAnnotation);
}

function toDeployAnnotation(doc: DeployAnnotationDoc): DeployAnnotation {
  return { id: doc._id, sourceId: doc.sourceId, label: doc.label, ts: doc.ts };
}
