'use server';

import { revalidatePath } from 'next/cache';
import { generateStatusPageLogoUploadUrl } from '../../../lib/status-pages/generate-status-page-logo-upload-url';
import { setStatusPageLogo } from '../../../lib/status-pages/set-status-page-logo';
import { upsertStatusPageConfig } from '../../../lib/status-pages/upsert-status-page-config';

export interface SaveStatusPageConfigActionState {
  error: string | null;
}

export async function saveStatusPageConfigAction(
  _prevState: SaveStatusPageConfigActionState,
  formData: FormData,
): Promise<SaveStatusPageConfigActionState> {
  const sourceId = String(formData.get('sourceId') ?? '').trim();
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

  try {
    await upsertStatusPageConfig({
      sourceId,
      slug,
      isEnabled,
      title,
      queueNames: queueNames.length > 0 ? queueNames : undefined,
    });
  } catch (error) {
    return { error: (error as Error).message };
  }

  revalidatePath('/app/status-pages');
  revalidatePath(`/app/status-pages/${sourceId}`);
  return { error: null };
}

export async function generateLogoUploadUrlAction(): Promise<string> {
  return await generateStatusPageLogoUploadUrl();
}

export async function setStatusPageLogoAction(args: {
  configId: string;
  storageId: string;
  sourceId: string;
}): Promise<void> {
  await setStatusPageLogo({ configId: args.configId, storageId: args.storageId });
  revalidatePath('/app/status-pages');
  revalidatePath(`/app/status-pages/${args.sourceId}`);
}
