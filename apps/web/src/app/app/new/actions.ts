'use server';

import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';

export interface CreateProjectActionState {
  error: string | null;
}

export async function createProjectAction(
  _prevState: CreateProjectActionState,
  formData: FormData,
): Promise<CreateProjectActionState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Project name is required.' };
  }

  const token = await convexAuthNextjsToken();
  const project = await fetchMutation(api.projects.createProject, { name }, { token });
  redirect(`/app/${project.slug}`);
}
