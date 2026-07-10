import Link from 'next/link';
import type { ReactNode } from 'react';
import { DocsMobileNav } from './_components/docs-mobile-nav';
import { DocsNavLinks } from './_components/docs-nav-links';

export default function DocsLayout(props: { children: ReactNode }) {
  const { children } = props;

  return (
    <div className="min-h-svh bg-bg-default">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-default/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 lg:px-8">
          <Link href="/" className="text-sm font-semibold text-content-emphasis">
            SuperBull
          </Link>
          <span className="text-sm text-content-muted">/</span>
          <Link href="/docs" className="text-sm font-medium text-content-default">
            Docs
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 lg:px-8">
        <div className="mb-6 lg:mb-0">
          <DocsMobileNav />
          <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-[calc(100svh-6rem)] lg:overflow-y-auto">
            <DocsNavLinks />
          </aside>
        </div>

        <main className="min-w-0 pb-24">{children}</main>
      </div>
    </div>
  );
}
