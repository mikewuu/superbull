'use server';

import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { revalidatePath } from 'next/cache';
import { api } from '../../../../../../convex/_generated/api';
import { generateApiKey } from '../../../../../lib/api-keys/generate-api-key';

export type CreateApiKeyActionState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | { status: 'created'; apiKey: string };

export async function createApiKeyAction(
  _previousState: CreateApiKeyActionState,
  formData: FormData,
): Promise<CreateApiKeyActionState> {
  const name = String(formData.get('name') ?? '').trim();
  const projectSlug = String(formData.get('project_slug') ?? '');
  if (!name) {
    return { status: 'error', error: 'Key name is required.' };
  }

  const generated = generateApiKey();
  try {
    const token = await convexAuthNextjsToken();
    await fetchMutation(
      api.apiKeys.insertApiKey,
      { name, keyHash: generated.keyHash, keyPrefix: generated.keyPrefix },
      { token },
    );
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Could not create key.',
    };
  }

  revalidatePath(`/app/${projectSlug}/settings`);
  return { status: 'created', apiKey: generated.apiKey };
}
