import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toErrorGroup } from './to-error-group';
import type { ErrorGroup, ErrorGroupState } from './types';

export async function listErrorGroups(args: {
  projectId: Id<'projects'>;
  connectorId: Id<'connectors'>;
  state?: ErrorGroupState;
}): Promise<ErrorGroup[]> {
  const token = await convexAuthNextjsToken();
  const docs = await fetchQuery(api.errors.listGroups, args, { token });
  return docs.map(toErrorGroup);
}
