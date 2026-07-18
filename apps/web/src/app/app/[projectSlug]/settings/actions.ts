'use server';

import { createHash, randomBytes } from 'node:crypto';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';

export interface InviteMemberActionState {
  error: string | null;
  acceptUrl?: string;
}

export async function inviteMemberAction(
  projectSlug: string,
  _prevState: InviteMemberActionState,
  formData: FormData,
): Promise<InviteMemberActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? 'member') as 'owner' | 'admin' | 'member';

  if (!email) {
    return { error: 'Email is required.' };
  }

  const { project } = await requireProjectForSlug(projectSlug);
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  try {
    const authToken = await convexAuthNextjsToken();
    await fetchMutation(
      api.invites.create,
      { projectId: project._id, email, role, tokenHash },
      { token: authToken },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create invite.' };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin') ?? `https://${requestHeaders.get('host') ?? ''}`;

  revalidatePath(`/app/${projectSlug}/settings`);
  return { error: null, acceptUrl: `${origin}/invite/${token}` };
}

export async function revokeInviteAction(projectSlug: string, inviteId: string): Promise<void> {
  const token = await convexAuthNextjsToken();
  await fetchMutation(api.invites.revoke, { inviteId: inviteId as Id<'invites'> }, { token });
  revalidatePath(`/app/${projectSlug}/settings`);
}

export async function removeMemberAction(
  projectSlug: string,
  memberId: string,
): Promise<{ error: string | null }> {
  const { project } = await requireProjectForSlug(projectSlug);
  const token = await convexAuthNextjsToken();
  try {
    await fetchMutation(
      api.projects.removeMember,
      { projectId: project._id, memberId: memberId as Id<'members'> },
      { token },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to remove member.' };
  }
  revalidatePath(`/app/${projectSlug}/settings`);
  return { error: null };
}

export interface DeleteProjectActionState {
  error: string | null;
}

export async function deleteProjectAction(
  projectSlug: string,
  _prevState: DeleteProjectActionState,
  formData: FormData,
): Promise<DeleteProjectActionState> {
  const name = String(formData.get('name') ?? '').trim();
  const { project } = await requireProjectForSlug(projectSlug);
  const token = await convexAuthNextjsToken();

  try {
    await fetchMutation(
      api.projects.deleteProjectAsOwner,
      { projectId: project._id, name },
      { token },
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete project.' };
  }

  redirect('/app');
}
