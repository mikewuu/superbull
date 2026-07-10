import { cn } from '../../../lib/cn';

interface StatTileProps {
  label: string;
  value: number;
  accent?: 'info' | 'error';
}

export function StatTile(props: StatTileProps) {
  const { label, value, accent } = props;

  return (
    <div
      data-testid={`stat-${label.toLowerCase()}`}
      className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-bg-default p-5"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">
        {label}
      </span>
      <span
        className={cn('font-mono text-2xl font-medium tracking-tight text-content-emphasis', {
          'text-content-info': accent === 'info' && value > 0,
          'text-content-error': accent === 'error' && value > 0,
        })}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
