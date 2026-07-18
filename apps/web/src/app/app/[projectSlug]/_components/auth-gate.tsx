'use client';

import { useConvexAuth } from '@convex-dev/auth/react';
import { Skeleton } from '@superbull/ui';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate(props: AuthGateProps) {
  const { children } = props;
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-bg-default">
        <div className="hidden w-60 shrink-0 border-r border-border-subtle p-3 lg:block">
          <Skeleton className="h-8 w-40" />
          <div className="mt-8 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="min-w-0 flex-1 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-6 h-9 w-full" />
          <Skeleton className="mt-4 h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
