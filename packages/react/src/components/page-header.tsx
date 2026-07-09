import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  controls?: ReactNode;
}

export function PageHeader(props: PageHeaderProps) {
  const { title, controls } = props;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-6">
      <h1 className="flex min-w-0 items-center gap-3 truncate text-lg font-semibold text-content-emphasis">
        {title}
      </h1>
      {controls && <div className="flex shrink-0 items-center gap-2">{controls}</div>}
    </header>
  );
}
