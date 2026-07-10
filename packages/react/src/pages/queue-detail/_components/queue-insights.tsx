import { cn } from '@bullwatch/ui';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { InsightsConcurrency } from './insights-concurrency';
import { InsightsPriorities } from './insights-priorities';
import { InsightsStats } from './insights-stats';
import { InsightsWorkers } from './insights-workers';

interface QueueInsightsProps {
  queueName: string;
}

export function QueueInsights(props: QueueInsightsProps) {
  const { queueName } = props;
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid="queue-insights" className="candy-card rounded-lg">
      <button
        type="button"
        data-testid="queue-insights-toggle"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-2sm font-medium text-content-emphasis">Insights</span>
        <ChevronDown
          className={cn('size-4 text-content-muted transition-transform duration-150', {
            'rotate-180': expanded,
          })}
        />
      </button>
      {expanded && (
        <div className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
          <InsightsStats queueName={queueName} />
          <InsightsWorkers queueName={queueName} />
          <InsightsPriorities queueName={queueName} />
          <InsightsConcurrency queueName={queueName} />
        </div>
      )}
    </div>
  );
}
