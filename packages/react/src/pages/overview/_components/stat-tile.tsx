import { cn } from '@superbull/ui';
import { cva } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const statTileIconVariants = cva('flex size-7 shrink-0 items-center justify-center rounded-lg', {
  variants: {
    tint: {
      blue: 'bg-blue-50 text-blue-600',
      violet: 'bg-violet-50 text-violet-600',
      red: 'bg-red-50 text-red-600',
      green: 'bg-green-50 text-green-600',
      amber: 'bg-amber-50 text-amber-600',
    },
  },
});

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tint: 'blue' | 'violet' | 'red' | 'green' | 'amber';
  accent?: 'error' | 'success' | 'warning';
  deltaPercent?: number | null;
  subline?: ReactNode;
}

export function StatTile(props: StatTileProps) {
  const { label, value, icon: Icon, tint, accent, deltaPercent, subline } = props;

  return (
    <div
      data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}
      className="flex flex-col gap-2 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <span className={statTileIconVariants({ tint })}>
          <Icon className="size-4" />
        </span>
        <span className="text-2sm text-content-subtle">{label}</span>
      </div>
      <span
        className={cn(
          'font-mono text-[22px] font-semibold tracking-tight tabular-nums text-content-emphasis',
          {
            'text-content-error': accent === 'error',
            'text-content-success': accent === 'success',
            'text-content-warning': accent === 'warning',
          },
        )}
      >
        {value}
      </span>
      <div className="flex items-center gap-1 text-xs">
        {deltaPercent !== undefined &&
          (deltaPercent === null ? (
            <span className="text-content-muted">—</span>
          ) : (
            <span
              className={cn('font-medium tabular-nums', {
                'text-content-success': deltaPercent >= 0,
                'text-content-error': deltaPercent < 0,
              })}
            >
              {deltaPercent >= 0 ? '+' : ''}
              {deltaPercent}%
            </span>
          ))}
        {deltaPercent !== undefined && <span className="text-content-muted">vs prev hour</span>}
        {deltaPercent === undefined && (
          <span className="text-content-muted">{subline ?? '\u00a0'}</span>
        )}
      </div>
    </div>
  );
}
