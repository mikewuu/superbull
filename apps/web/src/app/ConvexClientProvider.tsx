'use client';

import { ConvexAuthNextjsProvider } from '@convex-dev/auth/nextjs';
import { ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is required');
}
const convex = new ConvexReactClient(convexUrl);

interface ConvexClientProviderProps {
  children: ReactNode;
}

export function ConvexClientProvider(props: ConvexClientProviderProps) {
  const { children } = props;

  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
