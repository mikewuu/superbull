'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { setErrorGroupState } from '../../../../lib/errors/set-error-group-state';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';

async function setState(
  workspaceSlug: string,
  groupId: string,
  state: 'resolved' | 'ignored' | 'open',
): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  await setErrorGroupState({
    workspaceId: workspace._id,
    groupId: groupId as Id<'errorGroups'>,
    state,
  });
  revalidatePath(`/app/${workspaceSlug}/errors`);
  revalidatePath(`/app/${workspaceSlug}/errors/${groupId}`);
}

export async function resolveErrorGroupAction(
  workspaceSlug: string,
  groupId: string,
): Promise<void> {
  await setState(workspaceSlug, groupId, 'resolved');
}

export async function ignoreErrorGroupAction(
  workspaceSlug: string,
  groupId: string,
): Promise<void> {
  await setState(workspaceSlug, groupId, 'ignored');
}

export async function reopenErrorGroupAction(
  workspaceSlug: string,
  groupId: string,
): Promise<void> {
  await setState(workspaceSlug, groupId, 'open');
}
