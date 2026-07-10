'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '../_lib/cn';
import { docsNav } from '../_lib/nav';
import type { DocsSearchMatch } from '../_lib/search-index';
import { docsSearchIndex, findMatch } from '../_lib/search-index';

function highlightMatch(text: string, query: string): ReactNode {
  const matchIndex = text.toLowerCase().indexOf(query);
  if (!query || matchIndex === -1) {
    return text;
  }
  const matchEnd = matchIndex + query.length;
  return (
    <>
      {text.slice(0, matchIndex)}
      <strong className="font-semibold text-content-emphasis">
        {text.slice(matchIndex, matchEnd)}
      </strong>
      {text.slice(matchEnd)}
    </>
  );
}

type DocsNavMatchItem = {
  href: string;
  label: string;
  match: DocsSearchMatch | null;
};

function findMatchingGroups(query: string) {
  return docsNav
    .map((group) => {
      const items: DocsNavMatchItem[] = [];
      for (const item of group.items) {
        if (item.label.toLowerCase().includes(query)) {
          items.push({ ...item, match: null });
          continue;
        }
        const page = docsSearchIndex.find((indexed) => indexed.href === item.href);
        const match = page ? findMatch(page, query) : null;
        if (match) {
          items.push({ ...item, match });
        }
      }
      return { label: group.label, items };
    })
    .filter((group) => group.items.length > 0);
}

export function DocsNavLinks(props: { onNavigate?: () => void }) {
  const { onNavigate } = props;
  const pathname = usePathname();
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();
  const filteredNav = normalizedQuery
    ? findMatchingGroups(normalizedQuery)
    : docsNav.map((group) => ({
        label: group.label,
        items: group.items.map((item) => ({ ...item, match: null as DocsSearchMatch | null })),
      }));

  return (
    <nav className="space-y-6">
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search docs"
        className="h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-3 text-sm text-content-default outline-none transition-colors duration-150 ease-snout placeholder:text-content-muted focus-visible:border-border-emphasis focus-visible:ring-2 focus-visible:ring-blue-500/40"
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
              const href = item.match?.headingId
                ? `${item.href}#${item.match.headingId}`
                : item.href;
              const matchParts = item.match
                ? [item.match.headingText, item.match.snippet].filter(
                    (part): part is string => part !== null,
                  )
                : [];
              return (
                <li key={item.href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      'block rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-bg-subtle font-medium text-content-emphasis'
                        : 'text-content-subtle hover:bg-bg-muted hover:text-content-emphasis',
                    )}
                  >
                    <span className="block">{item.label}</span>
                    {matchParts.length > 0 ? (
                      <span className="mt-0.5 block truncate text-xs text-content-muted">
                        {matchParts.map((part, index) => (
                          <span key={part}>
                            {index > 0 ? ' — ' : null}
                            {highlightMatch(part, normalizedQuery)}
                          </span>
                        ))}
                      </span>
                    ) : null}
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
