import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  controls?: ReactNode;
  subtitle?: ReactNode;
}

export function PageHeader(props: PageHeaderProps) {
  const { title, controls, subtitle } = props;

  return (
    <header className="flex shrink-0 flex-col justify-center gap-0.5 px-4 py-3 lg:px-6">
      <div className="flex min-h-6 items-center justify-between gap-4">
        <h1 className="flex min-w-0 items-center gap-3 truncate text-[15px] font-semibold tracking-tight text-content-emphasis">
          {title}
        </h1>
        {controls && <div className="flex shrink-0 items-center gap-2">{controls}</div>}
      </div>
      {subtitle && <p className="truncate text-2sm text-content-subtle">{subtitle}</p>}
    </header>
  );
}
