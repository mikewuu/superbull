'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docsNav } from '../_lib/nav';

const flatNav = docsNav.flatMap((group) => group.items);

export function DocsPrevNext() {
  const pathname = usePathname();
  const index = flatNav.findIndex((item) => item.href === pathname);

  if (index === -1) {
    return null;
  }

  const prev = flatNav[index - 1];
  const next = flatNav[index + 1];

  if (!prev && !next) {
    return null;
  }

  return (
    <nav className="mt-16 flex items-center justify-between gap-4 border-t border-border-subtle pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="flex flex-col gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-bg-muted"
        >
          <span className="text-xs text-content-muted">Previous</span>
          <span className="font-medium text-content-emphasis">{prev.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="flex flex-col items-end gap-1 rounded-md px-2 py-1.5 text-right text-sm transition-colors hover:bg-bg-muted"
        >
          <span className="text-xs text-content-muted">Next</span>
          <span className="font-medium text-content-emphasis">{next.label}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
