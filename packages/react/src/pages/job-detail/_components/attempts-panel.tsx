import { cn } from '@bullwatch/ui';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface AttemptsPanelProps {
  stacktrace: string[];
}

export function AttemptsPanel(props: AttemptsPanelProps) {
  const { stacktrace } = props;

  if (stacktrace.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="border-b border-t border-border-subtle px-4 py-2 text-2sm font-medium text-content-emphasis">
        Attempts
      </h2>
      <div className="flex flex-col divide-y divide-border-subtle">
        {stacktrace.map((trace, index) => (
          <AttemptCard
            key={`attempt-${index}-${trace.length}`}
            attemptNumber={index + 1}
            trace={trace}
          />
        ))}
      </div>
    </div>
  );
}

function AttemptCard(props: { attemptNumber: number; trace: string }) {
  const { attemptNumber, trace } = props;
  const [expanded, setExpanded] = useState(false);
  const firstLine = trace.split('\n')[0] ?? '';
  const hasMore = trace.length > firstLine.length;

  return (
    <div className="px-4 py-2.5" data-testid="attempt-card">
      <button
        type="button"
        data-testid="attempt-toggle"
        onClick={() => setExpanded((current) => !current)}
        disabled={!hasMore}
        className="flex w-full items-start justify-between gap-2 text-left disabled:cursor-default"
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="mt-0.5 shrink-0 text-xs font-medium text-content-muted">
            #{attemptNumber}
          </span>
          <span
            className={cn('font-mono text-xs text-content-default', {
              truncate: !expanded,
              'whitespace-pre-wrap': expanded,
            })}
          >
            {expanded ? trace : firstLine}
          </span>
        </div>
        {hasMore && (
          <ChevronDown
            className={cn(
              'mt-0.5 size-3.5 shrink-0 text-content-muted transition-transform duration-150',
              { 'rotate-180': expanded },
            )}
          />
        )}
      </button>
    </div>
  );
}
