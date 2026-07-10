import Image from 'next/image';
import Link from 'next/link';

const githubUrl = 'https://github.com/mikewu/superbull';

export function NavBar(): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-default/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/landing/logos/logo-mark.webp" alt="" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight text-content-emphasis">
            SuperBull
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-2sm font-medium text-content-default md:flex">
          <Link href="/docs" className="transition-colors hover:text-content-emphasis">
            Docs
          </Link>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-content-emphasis"
          >
            GitHub
          </a>
        </nav>

        <a
          href="#install"
          className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-2sm font-semibold text-white transition-colors hover:bg-brand-deep"
        >
          Mount the board →
        </a>
      </div>
    </header>
  );
}
