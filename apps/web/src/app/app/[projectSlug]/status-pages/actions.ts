'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';
import { generateStatusPageLogoUploadUrl } from '../../../../lib/status-pages/generate-status-page-logo-upload-url';
import { setStatusPageLogo } from '../../../../lib/status-pages/set-status-page-logo';
import { upsertStatusPageConfig } from '../../../../lib/status-pages/upsert-status-page-config';

export interface SaveStatusPageConfigActionState {
  error: string | null;
}

export async function saveStatusPageConfigAction(
  projectSlug: string,
  _prevState: SaveStatusPageConfigActionState,
  formData: FormData,
): Promise<SaveStatusPageConfigActionState> {
  const connectorId = String(formData.get('connectorId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const isEnabled = formData.get('isEnabled') === 'on';
  const queueNames = String(formData.get('queueNames') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  if (!slug || !title) {
    return { error: 'Slug and title are both required.' };
  }

  const { project } = await requireProjectForSlug(projectSlug);

  try {
    await upsertStatusPageConfig({
      projectId: project._id,
      connectorId: connectorId as Id<'connectors'>,
      slug,
      isEnabled,
      title,
      queueNames: queueNames.length > 0 ? queueNames : undefined,
    });
  } catch (error) {
    return { error: (error as Error).message };
  }

  revalidatePath(`/app/${projectSlug}/status-pages`);
  revalidatePath(`/app/${projectSlug}/status-pages/${connectorId}`);
  return { error: null };
}

export async function generateLogoUploadUrlAction(projectSlug: string): Promise<string> {
  const { project } = await requireProjectForSlug(projectSlug);
  return await generateStatusPageLogoUploadUrl(project._id);
}

export async function setStatusPageLogoAction(
  projectSlug: string,
  args: { configId: string; storageId: string; connectorId: string },
): Promise<void> {
  const { project } = await requireProjectForSlug(projectSlug);
  await setStatusPageLogo({
    projectId: project._id,
    configId: args.configId as Id<'statusPageConfigs'>,
    storageId: args.storageId as Id<'_storage'>,
  });
  revalidatePath(`/app/${projectSlug}/status-pages`);
  revalidatePath(`/app/${projectSlug}/status-pages/${args.connectorId}`);
}
