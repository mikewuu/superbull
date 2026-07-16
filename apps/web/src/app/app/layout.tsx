import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ConvexClientProvider } from '../ConvexClientProvider';
import { NavLinks } from './_components/nav-links';
import { SidebarFooter } from './_components/sidebar-footer';

export const metadata: Metadata = {
  title: 'SuperBull Hub',
  description: 'Federated dashboard for superbull proxy sources',
};

interface AppLayoutProps {
  children: ReactNode;
}

// The product subtree (everything under /app) is the only part of the site
// that needs Convex Auth — marketing and docs stay static, and /status +
// /s/[sourceId] read Convex through the internalToken server client instead
// of a user session. See also src/app/signin/layout.tsx, which needs the
// same providers for its sign-in form.
export default function AppLayout(props: AppLayoutProps) {
  const { children } = props;

  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        <div className="flex min-h-screen bg-bg-default">
          <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-border-subtle bg-bg-default p-3">
            <Link href="/app" className="flex h-10 items-center gap-2.5 px-2">
              <img src="/logo-mark.webp" alt="" className="h-7 w-auto" />
              <span className="text-2sm font-semibold tracking-tight text-content-emphasis">
                SuperBull Hub
              </span>
            </Link>
            <NavLinks />
            <SidebarFooter />
          </aside>
          <main className="min-w-0 flex-1 overflow-y-auto bg-bg-default">{children}</main>
        </div>
      </ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
