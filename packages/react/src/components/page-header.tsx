import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  controls?: ReactNode;
}

export function PageHeader(props: PageHeaderProps) {
  const { title, controls } = props;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 px-4 lg:px-6">
      <h1 className="flex min-w-0 items-center gap-3 truncate text-[15px] font-semibold tracking-tight text-content-emphasis">
        {title}
      </h1>
      {controls && <div className="flex shrink-0 items-center gap-2">{controls}</div>}
    </header>
  );
}
