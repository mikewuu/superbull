import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { env } from '../config/env';
import type { PublicStatusPage } from './types';

const getPublicPage = makeFunctionReference<'query'>('statusPages:getPublicPage');

export async function getPublicStatusPage(args: {
  slug: string;
}): Promise<PublicStatusPage | null> {
  if (!env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required');
  }
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  return await client.query(getPublicPage, args);
}
