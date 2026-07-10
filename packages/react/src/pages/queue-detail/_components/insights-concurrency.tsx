import { Button, Skeleton } from '@superbull/ui';
import { useState } from 'react';
import { useQueueConcurrency } from '../../../hooks/use-queue-concurrency';
import { useSetConcurrency } from '../../../hooks/use-set-concurrency';

interface InsightsConcurrencyProps {
  queueName: string;
}

export function InsightsConcurrency(props: InsightsConcurrencyProps) {
  const { queueName } = props;
  const { data: concurrency, isPending } = useQueueConcurrency(queueName);
  const setConcurrency = useSetConcurrency();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = () => {
    setDraft(concurrency?.global_concurrency != null ? String(concurrency.global_concurrency) : '');
    setEditing(true);
  };

  const save = () => {
    const value = Number(draft);
    if (!Number.isInteger(value) || value <= 0) {
      return;
    }
    setConcurrency.mutate(
      { queueName, globalConcurrency: value },
      { onSuccess: () => setEditing(false) },
    );
  };

  if (isPending) {
    return (
      <div className="px-4 py-3" data-testid="insights-concurrency">
        <h3 className="mb-2 text-xs font-medium text-content-subtle">Global concurrency</h3>
        <Skeleton className="h-7 w-20" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
      data-testid="insights-concurrency"
    >
      <span className="text-xs font-medium text-content-subtle">Global concurrency</span>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="number"
              min={1}
              value={draft}
              aria-label="Global concurrency"
              onChange={(event) => setDraft(event.target.value)}
              className="h-7 w-20 rounded-md border-border-subtle text-xs text-content-emphasis focus:border-border-emphasis focus:ring-0"
            />
            <Button
              className="h-7 px-2 text-xs"
              text="Save"
              loading={setConcurrency.isPending}
              onClick={save}
            />
          </>
        ) : (
          <>
            <span className="font-mono text-xs tabular-nums text-content-emphasis">
              {concurrency?.global_concurrency ?? '—'}
            </span>
            <Button
              variant="secondary"
              className="h-7 px-2 text-xs"
              text="Edit"
              onClick={startEditing}
            />
          </>
        )}
      </div>
      {concurrency?.rate_limit_ttl_ms != null && (
        <span className="w-full text-xs text-content-warning">
          rate limited, resets in {Math.ceil(concurrency.rate_limit_ttl_ms / 1000)}s
        </span>
      )}
    </div>
  );
}
