'use client';

import { cn } from '@superbull/ui';
import { AlertTriangle, Bell, ChartLine, LayoutDashboard, Radio, Server } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/app', label: 'Sources', icon: Server },
  { href: '/app/analytics', label: 'Analytics', icon: ChartLine },
  { href: '/app/errors', label: 'Errors', icon: AlertTriangle },
  { href: '/app/alerts', label: 'Alerts', icon: Bell },
  { href: '/app/dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { href: '/app/status-pages', label: 'Status pages', icon: Radio },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
      <span className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-content-muted">
        Main
      </span>
      {links.map((link) => {
        const isActive =
          link.href === '/app' ? pathname === '/app' : pathname.startsWith(link.href);
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
    </nav>
  );
}
