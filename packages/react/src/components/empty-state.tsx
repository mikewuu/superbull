import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState(props: EmptyStateProps) {
  const { icon: Icon, title, description } = props;

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg bg-bg-subtle">
        <Icon className="size-5 text-content-muted" />
      </div>
      <p className="mt-1 text-sm font-medium text-content-emphasis">{title}</p>
      {description && <p className="max-w-sm text-sm text-content-subtle">{description}</p>}
    </div>
  );
}
