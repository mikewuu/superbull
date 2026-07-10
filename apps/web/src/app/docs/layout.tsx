import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { DocsMobileNav } from './_components/docs-mobile-nav';
import { DocsNavLinks } from './_components/docs-nav-links';
import { DocsPrevNext } from './_components/docs-prev-next';

export default function DocsLayout(props: { children: ReactNode }) {
  const { children } = props;

  return (
    <div className="min-h-svh bg-bg-default">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-bg-default/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/landing/logos/logo-mark.webp" alt="" width={24} height={24} />
            <span className="text-lg font-semibold tracking-tight text-content-emphasis">
              SuperBull
            </span>
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
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-[calc(100svh-7rem)] lg:overflow-y-auto">
            <DocsNavLinks />
          </aside>
        </div>

        <main className="min-w-0 pb-24">
          {children}
          <DocsPrevNext />
        </main>
      </div>
    </div>
  );
}
