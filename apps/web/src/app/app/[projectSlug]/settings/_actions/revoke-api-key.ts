'use server';

import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation } from 'convex/nextjs';
import { revalidatePath } from 'next/cache';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';

export async function revokeApiKey(args: {
  projectSlug: string;
  apiKeyId: Id<'apiKeys'>;
}): Promise<{ wasSuccessful: true } | { wasSuccessful: false; error: string }> {
  try {
    const token = await convexAuthNextjsToken();
    await fetchMutation(api.apiKeys.revokeApiKey, { apiKeyId: args.apiKeyId }, { token });
  } catch (error) {
    return {
      wasSuccessful: false,
      error: error instanceof Error ? error.message : 'Could not revoke key.',
    };
  }

  revalidatePath(`/app/${args.projectSlug}/settings`);
  return { wasSuccessful: true };
}
