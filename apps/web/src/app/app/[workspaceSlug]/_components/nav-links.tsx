'use client';

import { cn } from '@superbull/ui';
import {
  AlertTriangle,
  Bell,
  ChartLine,
  LayoutDashboard,
  Radio,
  Server,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinksProps {
  workspaceSlug: string;
}

export function NavLinks(props: NavLinksProps) {
  const { workspaceSlug } = props;
  const pathname = usePathname();

  const links: Array<{ href: string; label: string; icon: LucideIcon }> = [
    { href: `/app/${workspaceSlug}/connectors`, label: 'Connectors', icon: Server },
    { href: `/app/${workspaceSlug}/analytics`, label: 'Analytics', icon: ChartLine },
    { href: `/app/${workspaceSlug}/errors`, label: 'Errors', icon: AlertTriangle },
    { href: `/app/${workspaceSlug}/alerts`, label: 'Alerts', icon: Bell },
    { href: `/app/${workspaceSlug}/dashboards`, label: 'Dashboards', icon: LayoutDashboard },
    { href: `/app/${workspaceSlug}/status-pages`, label: 'Status pages', icon: Radio },
  ];

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
      <span className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-content-muted">
        Main
      </span>
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-2sm text-content-subtle transition-colors duration-150 ease-snout hover:bg-bg-subtle',
              { 'bg-blue-50 font-medium text-blue-600 hover:bg-blue-50': isActive },
            )}
          >
            <Icon className="size-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
      <span className="px-2.5 pb-1.5 pt-3 text-[11px] font-medium uppercase tracking-wide text-content-muted">
        Workspace
      </span>
      <Link
        href={`/app/${workspaceSlug}/settings`}
        className={cn(
          'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-2sm text-content-subtle transition-colors duration-150 ease-snout hover:bg-bg-subtle',
          {
            'bg-blue-50 font-medium text-blue-600 hover:bg-blue-50': pathname.startsWith(
              `/app/${workspaceSlug}/settings`,
            ),
          },
        )}
      >
        <Settings className="size-4 shrink-0" />
        Settings
      </Link>
    </nav>
  );
}
