import Link from 'next/link';
import { cn } from '../_lib/cn';
import type { DocsHeading } from '../_lib/get-headings';

export function DocsToc(props: { headings: DocsHeading[] }) {
  const { headings } = props;

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-24 hidden w-48 shrink-0 xl:block">
      <p className="px-2 text-xs font-semibold tracking-wide text-content-muted uppercase">
        On this page
      </p>
      <ul className="mt-2 space-y-1.5 border-l border-border-subtle">
        {headings.map((heading) => (
          <li key={heading.id}>
            <Link
              href={`#${heading.id}`}
              className={cn(
                '-ml-px block border-l px-3 py-0.5 text-2sm text-content-subtle transition-colors hover:border-border-emphasis hover:text-content-emphasis',
                heading.level === 3 ? 'border-transparent pl-6' : 'border-transparent',
              )}
            >
              {heading.text}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
