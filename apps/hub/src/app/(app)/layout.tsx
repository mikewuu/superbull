import { Activity } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavLinks } from './_components/nav-links';
import { SidebarFooter } from './_components/sidebar-footer';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout(props: AppLayoutProps) {
  const { children } = props;

  return (
    <div className="flex min-h-screen bg-bg-default">
      <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-border-subtle bg-bg-default p-3">
        <Link href="/" className="flex h-10 items-center gap-2.5 px-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-bg-inverted">
            <Activity className="size-4 text-content-inverted" />
          </span>
          <span className="text-2sm font-semibold tracking-tight text-content-emphasis">
            SuperBull Hub
          </span>
        </Link>
        <NavLinks />
        <SidebarFooter />
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto bg-bg-default">{children}</main>
    </div>
  );
}
