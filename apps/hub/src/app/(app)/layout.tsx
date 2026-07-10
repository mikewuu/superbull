import { Activity } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavLinks } from './_components/nav-links';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout(props: AppLayoutProps) {
  const { children } = props;

  return (
    <div className="flex min-h-screen bg-white text-neutral-900">
      <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-neutral-200 p-3">
        <Link href="/" className="flex h-10 items-center gap-2.5 px-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-neutral-900">
            <Activity className="size-4 text-white" />
          </span>
          <span className="text-[13px] font-semibold tracking-tight">bullwatch hub</span>
        </Link>
        <NavLinks />
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
