import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { toErrorGroup } from './to-error-group';
import type { ErrorGroup, ErrorGroupState } from './types';

export async function setErrorGroupState(args: {
  projectId: Id<'projects'>;
  groupId: Id<'errorGroups'>;
  state: ErrorGroupState;
}): Promise<ErrorGroup> {
  const token = await convexAuthNextjsToken();
  const doc = await fetchMutation(api.errors.setGroupState, args, { token });
  if (!doc) {
    throw new Error('failed to update error group');
  }
  return toErrorGroup(doc);
}
