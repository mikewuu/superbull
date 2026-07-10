import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { env } from '../config/env';
import type { PublicStatusPageUptime } from './types';

const getPublicUptime = makeFunctionReference<'query'>('statusPages:getPublicUptime');

export async function getPublicStatusPageUptime(args: {
  slug: string;
}): Promise<PublicStatusPageUptime | null> {
  if (!env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is required');
  }
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  return await client.query(getPublicUptime, args);
}
