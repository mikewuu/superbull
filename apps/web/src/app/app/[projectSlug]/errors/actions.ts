'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { setErrorGroupState } from '../../../../lib/errors/set-error-group-state';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';

async function setState(
  projectSlug: string,
  groupId: string,
  state: 'resolved' | 'ignored' | 'open',
): Promise<void> {
  const { project } = await requireProjectForSlug(projectSlug);
  await setErrorGroupState({
    projectId: project._id,
    groupId: groupId as Id<'errorGroups'>,
    state,
  });
  revalidatePath(`/app/${projectSlug}/errors`);
  revalidatePath(`/app/${projectSlug}/errors/${groupId}`);
}

export async function resolveErrorGroupAction(projectSlug: string, groupId: string): Promise<void> {
  await setState(projectSlug, groupId, 'resolved');
}

export async function ignoreErrorGroupAction(projectSlug: string, groupId: string): Promise<void> {
  await setState(projectSlug, groupId, 'ignored');
}

export async function reopenErrorGroupAction(projectSlug: string, groupId: string): Promise<void> {
  await setState(projectSlug, groupId, 'open');
}
