import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export async function deleteAlertRule(
  projectId: Id<'projects'>,
  id: Id<'alertRules'>,
): Promise<void> {
  const token = await convexAuthNextjsToken();
  await fetchMutation(api.alerts.remove, { projectId, id }, { token });
}
