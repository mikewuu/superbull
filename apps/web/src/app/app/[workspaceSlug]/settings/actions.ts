'use server';

import { createHash, randomBytes } from 'node:crypto';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';

export interface InviteMemberActionState {
  error: string | null;
  acceptUrl?: string;
}

export async function inviteMemberAction(
  workspaceSlug: string,
  _prevState: InviteMemberActionState,
  formData: FormData,
): Promise<InviteMemberActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? 'member') as 'owner' | 'admin' | 'member';

  if (!email) {
    return { error: 'Email is required.' };
  }

  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  try {
    const authToken = await convexAuthNextjsToken();
    await fetchMutation(
      api.invites.create,
      { workspaceId: workspace._id, email, role, tokenHash },
      { token: authToken },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create invite.' };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin') ?? `https://${requestHeaders.get('host') ?? ''}`;

  revalidatePath(`/app/${workspaceSlug}/settings`);
  return { error: null, acceptUrl: `${origin}/invite/${token}` };
}

export async function revokeInviteAction(workspaceSlug: string, inviteId: string): Promise<void> {
  const token = await convexAuthNextjsToken();
  await fetchMutation(api.invites.revoke, { inviteId: inviteId as Id<'invites'> }, { token });
  revalidatePath(`/app/${workspaceSlug}/settings`);
}

export async function removeMemberAction(
  workspaceSlug: string,
  memberId: string,
): Promise<{ error: string | null }> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const token = await convexAuthNextjsToken();
  try {
    await fetchMutation(
      api.workspaces.removeMember,
      { workspaceId: workspace._id, memberId: memberId as Id<'members'> },
      { token },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to remove member.' };
  }
  revalidatePath(`/app/${workspaceSlug}/settings`);
  return { error: null };
}

export interface DeleteWorkspaceActionState {
  error: string | null;
}

export async function deleteWorkspaceAction(
  workspaceSlug: string,
  _prevState: DeleteWorkspaceActionState,
  formData: FormData,
): Promise<DeleteWorkspaceActionState> {
  const name = String(formData.get('name') ?? '').trim();
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const token = await convexAuthNextjsToken();

  try {
    await fetchMutation(
      api.workspaces.deleteWorkspaceAsOwner,
      { workspaceId: workspace._id, name },
      { token },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete workspace.' };
  }

  redirect('/app');
}
