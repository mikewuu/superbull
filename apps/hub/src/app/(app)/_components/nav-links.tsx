'use client';

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
    <nav className="flex flex-col gap-0.5">
      {links.map((link) => {
        const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? 'flex h-8 items-center gap-2.5 rounded-md bg-blue-50 px-2.5 text-[13px] font-medium text-blue-600'
                : 'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
            }
          >
            <Icon className="size-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
