'use server';

import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';

export interface CreateWorkspaceActionState {
  error: string | null;
}

export async function createWorkspaceAction(
  _prevState: CreateWorkspaceActionState,
  formData: FormData,
): Promise<CreateWorkspaceActionState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Workspace name is required.' };
  }

  const token = await convexAuthNextjsToken();
  const workspace = await fetchMutation(api.workspaces.createWorkspace, { name }, { token });
  redirect(`/app/${workspace.slug}`);
}
