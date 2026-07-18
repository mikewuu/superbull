import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toErrorGroup } from './to-error-group';
import type { ErrorGroup } from './types';

export async function findErrorGroupById(
  projectId: Id<'projects'>,
  groupId: Id<'errorGroups'>,
): Promise<ErrorGroup | null> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchQuery(api.errors.getGroup, { projectId, groupId }, { token });
  return doc ? toErrorGroup(doc) : null;
}
