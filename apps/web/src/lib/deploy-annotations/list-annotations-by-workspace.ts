import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import type { DeployAnnotation } from './types';

// User-facing (dashboard), workspace + Convex-auth scoped.
export async function listAnnotationsByWorkspace(
  workspaceId: Id<'workspaces'>,
  connectorId: Id<'connectors'>,
): Promise<DeployAnnotation[]> {
  const token = await convexAuthNextjsToken();
  const docs = await fetchQuery(
    api.deployAnnotations.listByWorkspace,
    { workspaceId, connectorId },
    { token },
  );
  return docs.map((doc) => ({
    id: doc._id,
    connectorId: doc.connectorId,
    label: doc.label,
    ts: doc.ts,
  }));
}
