'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '../_lib/cn';
import { docsNav } from '../_lib/nav';
import { docsSearchIndex } from '../_lib/search-index';

export function DocsNavLinks(props: { onNavigate?: () => void }) {
  const { onNavigate } = props;
  const pathname = usePathname();
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();
  const filteredNav = normalizedQuery
    ? docsNav
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (item.label.toLowerCase().includes(normalizedQuery)) {
              return true;
            }
            const entry = docsSearchIndex.find((indexed) => indexed.href === item.href);
            return entry ? entry.text.includes(normalizedQuery) : false;
          }),
        }))
        .filter((group) => group.items.length > 0)
    : docsNav;

  return (
    <nav className="space-y-6">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search docs"
        className="h-9 w-full rounded-md border border-border-subtle bg-bg-default px-3 text-sm text-content-default placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-border-emphasis"
      />
      {filteredNav.length === 0 ? (
        <p className="px-2 text-sm text-content-muted">No pages match &quot;{query}&quot;.</p>
      ) : null}
      {filteredNav.map((group) => (
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
