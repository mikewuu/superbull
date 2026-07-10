'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../_lib/cn';
import { docsNav } from '../_lib/nav';

export function DocsNavLinks(props: { onNavigate?: () => void }) {
  const { onNavigate } = props;
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {docsNav.map((group) => (
        <div key={group.label}>
          <p className="px-2 text-xs font-semibold tracking-wide text-content-muted uppercase">
            {group.label}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'block rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-bg-subtle font-medium text-content-emphasis'
                        : 'text-content-subtle hover:bg-bg-muted hover:text-content-emphasis',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
