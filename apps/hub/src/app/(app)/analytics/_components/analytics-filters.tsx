'use client';

import { cn } from '@superbull/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AnalyticsRange } from '../../../../lib/analytics/types';

const ranges: AnalyticsRange[] = ['24h', '7d', '30d'];

interface AnalyticsFiltersProps {
  sources: Array<{ id: string; name: string }>;
  selectedSourceId: string;
  selectedRange: AnalyticsRange;
}

export function AnalyticsFilters(props: AnalyticsFiltersProps) {
  const { sources, selectedSourceId, selectedRange } = props;
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Source"
        value={selectedSourceId}
        onChange={(event) => setParam('source', event.target.value)}
        className="h-9 rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
      <div className="flex rounded-lg border border-border-subtle p-0.5">
        {ranges.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setParam('range', range)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium text-content-subtle transition-colors duration-150 ease-snout',
              { 'bg-bg-inverted text-white': range === selectedRange },
            )}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
  );
}
