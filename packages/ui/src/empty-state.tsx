import type { ReactNode } from 'react';

interface EmptyStateProps {
  // A rendered element (e.g. <Cable className="size-5 text-content-muted" />),
  // not a component function: packages/ui builds with a package-level
  // 'use client' banner, so EmptyState is a client reference and component
  // functions passed from server components cannot cross the RSC boundary.
  icon: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState(props: EmptyStateProps) {
  const { icon, title, description } = props;

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg bg-bg-subtle">{icon}</div>
      <p className="mt-1 text-sm font-medium text-content-emphasis">{title}</p>
      {description && <p className="max-w-sm text-sm text-content-subtle">{description}</p>}
    </div>
  );
}
