'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { generateStatusPageLogoUploadUrl } from '../../../../lib/status-pages/generate-status-page-logo-upload-url';
import { setStatusPageLogo } from '../../../../lib/status-pages/set-status-page-logo';
import { upsertStatusPageConfig } from '../../../../lib/status-pages/upsert-status-page-config';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';

export interface SaveStatusPageConfigActionState {
  error: string | null;
}

export async function saveStatusPageConfigAction(
  workspaceSlug: string,
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

  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);

  try {
    await upsertStatusPageConfig({
      workspaceId: workspace._id,
      connectorId: connectorId as Id<'connectors'>,
      slug,
      isEnabled,
      title,
      queueNames: queueNames.length > 0 ? queueNames : undefined,
    });
  } catch (error) {
    return { error: (error as Error).message };
  }

  revalidatePath(`/app/${workspaceSlug}/status-pages`);
  revalidatePath(`/app/${workspaceSlug}/status-pages/${connectorId}`);
  return { error: null };
}

export async function generateLogoUploadUrlAction(workspaceSlug: string): Promise<string> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  return await generateStatusPageLogoUploadUrl(workspace._id);
}

export async function setStatusPageLogoAction(
  workspaceSlug: string,
  args: { configId: string; storageId: string; connectorId: string },
): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  await setStatusPageLogo({
    workspaceId: workspace._id,
    configId: args.configId as Id<'statusPageConfigs'>,
    storageId: args.storageId as Id<'_storage'>,
  });
  revalidatePath(`/app/${workspaceSlug}/status-pages`);
  revalidatePath(`/app/${workspaceSlug}/status-pages/${args.connectorId}`);
}
