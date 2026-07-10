import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

interface StatTileProps {
  label: string;
  value: ReactNode;
  accent?: 'info' | 'error' | 'success';
}

export function StatTile(props: StatTileProps) {
  const { label, value, accent } = props;

  return (
    <div
      data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}
      className="candy-card flex flex-col gap-0.5 rounded-lg px-4 py-3"
    >
      <span className="text-[12.5px] text-content-subtle">{label}</span>
      <span
        className={cn('font-mono text-[21px] font-semibold tracking-tight text-content-emphasis', {
          'text-content-info': accent === 'info',
          'text-content-error': accent === 'error',
          'text-content-success': accent === 'success',
        })}
      >
        {value}
      </span>
    </div>
  );
}
