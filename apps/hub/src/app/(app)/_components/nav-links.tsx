'use client';

import { cn } from '@bullwatch/ui';
import { AlertTriangle, Bell, ChartLine, LayoutDashboard, Radio, Server } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/', label: 'Sources', icon: Server },
  { href: '/analytics', label: 'Analytics', icon: ChartLine },
  { href: '/errors', label: 'Errors', icon: AlertTriangle },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { href: '/status-pages', label: 'Status pages', icon: Radio },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
      <span className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wide text-content-muted">
        Main
      </span>
      {links.map((link) => {
        const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
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
