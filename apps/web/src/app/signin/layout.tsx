import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import type { ReactNode } from 'react';
import { ConvexClientProvider } from '../ConvexClientProvider';

interface SignInLayoutProps {
  children: ReactNode;
}

// /signin needs the same Convex Auth providers as the /app subtree (its
// form calls useAuthActions), but it isn't nested under /app, so it gets
// its own thin layout instead of inheriting one.
export default function SignInLayout(props: SignInLayoutProps) {
  const { children } = props;

  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
