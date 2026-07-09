import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { PageHeader } from '../../components/page-header';
import { useQueues } from '../../hooks/use-queues';
import { type QueueStatus, jobStatuses } from '../../lib/api-types';
import { BulkActionsBar } from './_components/bulk-actions-bar';
import { JobTable } from './_components/job-table';
import { MetricsChart } from './_components/metrics-chart';
import { QueueControls } from './_components/queue-controls';
import { QueuePagination } from './_components/queue-pagination';
import { StatusFilter } from './_components/status-filter';

function readSelectedStatus(value: string | null): QueueStatus {
  if (value === 'latest') {
    return 'latest';
  }
  const match = jobStatuses.find((status) => status === value);
  return match ?? 'latest';
}

export function QueueDetailPage() {
  const { queueName = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const status = readSelectedStatus(searchParams.get('status'));
  const page = Number(searchParams.get('page') ?? '1');

  const { data: queues, error } = useQueues({ activeQueue: queueName, status, page });
  const queue = queues?.find((candidate) => candidate.name === queueName);

  if (error) {
    return (
      <>
        <PageHeader title={queueName} />
        <p className="px-6 py-6 text-sm text-content-error">
          Failed to load queue: {error.message}
        </p>
      </>
    );
  }

  if (!queue) {
    return (
      <>
        <PageHeader title={queueName} />
        <p className="px-6 py-6 text-sm text-content-subtle">Loading…</p>
      </>
    );
  }

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <>
      <PageHeader
        title={queue.display_name || queue.name}
        controls={<QueueControls queue={queue} />}
      />
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-3 py-6 lg:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <MetricsChart queueName={queue.name} type="completed" />
          <MetricsChart queueName={queue.name} type="failed" />
        </div>
        <StatusFilter
          queue={queue}
          status={status}
          onChange={(next) => {
            clearSelection();
            setSearchParams((params) => {
              params.set('status', next);
              params.delete('page');
              return params;
            });
          }}
        />
        {selectedIds.size > 0 && (
          <BulkActionsBar
            queueName={queue.name}
            selectedIds={[...selectedIds]}
            onDone={clearSelection}
          />
        )}
        <JobTable
          queue={queue}
          selectedStatus={status}
          selectedIds={selectedIds}
          onToggle={(jobId) =>
            setSelectedIds((current) => {
              const next = new Set(current);
              if (next.has(jobId)) {
                next.delete(jobId);
              } else {
                next.add(jobId);
              }
              return next;
            })
          }
          onToggleAll={(jobIds) =>
            setSelectedIds((current) =>
              current.size === jobIds.length ? new Set() : new Set(jobIds),
            )
          }
        />
        <QueuePagination
          pagination={queue.pagination}
          page={page}
          onChange={(next) =>
            setSearchParams((params) => {
              params.set('page', String(next));
              return params;
            })
          }
        />
      </div>
    </>
  );
}
