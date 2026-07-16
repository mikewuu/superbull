import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import type { ReactNode } from 'react';
import { ConvexClientProvider } from './ConvexClientProvider';

interface AuthProvidersProps {
  children: ReactNode;
}

// Convex Auth providers are scoped to the three subtrees that need a user
// session client-side (/app, /signin, /invite) instead of the root layout, so
// marketing (/), docs, and public /status pages stay statically prerendered.
export function AuthProviders(props: AuthProvidersProps) {
  const { children } = props;

  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
