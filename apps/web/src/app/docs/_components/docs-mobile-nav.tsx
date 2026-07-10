'use client';

import { useState } from 'react';
import { DocsNavLinks } from './docs-nav-links';

export function DocsMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border-subtle bg-bg-default px-3 text-sm font-medium text-content-emphasis"
      >
        Menu
        <span className="text-content-muted">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen ? (
        <div className="mt-3 rounded-md border border-border-subtle bg-bg-default p-3">
          <DocsNavLinks onNavigate={() => setIsOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
