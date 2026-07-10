import { makeFunctionReference } from 'convex/server';
import { createServerConvexClient } from '../convex/create-server-convex-client';

const generateLogoUploadUrl = makeFunctionReference<'mutation'>(
  'statusPages:generateLogoUploadUrl',
);

export async function generateStatusPageLogoUploadUrl(): Promise<string> {
  const client = createServerConvexClient();
  return await client.mutation(generateLogoUploadUrl, {});
}
