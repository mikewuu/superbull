import { CirclePause } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Breadcrumbs } from '../../components/breadcrumbs';
import { PageHeader } from '../../components/page-header';
import { SearchInput } from '../../components/search-input';
import { Skeleton } from '../../components/skeleton';
import { StatusBadge } from '../../components/status-badge';
import { useQueues } from '../../hooks/use-queues';
import { type QueueStatus, jobStatuses } from '../../lib/api-types';
import { BulkActionsBar } from './_components/bulk-actions-bar';
import { JobTable } from './_components/job-table';
import { MetricsChart } from './_components/metrics-chart';
import { QueueActions } from './_components/queue-actions';
import { QueuePagination } from './_components/queue-pagination';
import { StatusFilter } from './_components/status-filter';

function readSelectedStatus(value: string | null): QueueStatus {
  const match = jobStatuses.find((status) => status === value);
  return match ?? 'latest';
}

export function QueueDetailPage() {
  const { queueName = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const status = readSelectedStatus(searchParams.get('status'));
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
  const perPage = Number(searchParams.get('per_page') ?? '10');

  const { data: queues, error } = useQueues({
    activeQueue: queueName,
    status,
    page,
    sort,
    perPage,
    search: search || undefined,
  });
  const queue = queues?.find((candidate) => candidate.name === queueName);

  const clearSelection = () => setSelectedIds(new Set());

  // Stable identity: SearchInput debounces against this; a fresh lambda per render
  // would reset the debounce timer on every poll re-render.
  const changeSearch = useCallback(
    (next: string) => {
      setSelectedIds(new Set());
      setSearchParams((params) => {
        if (next) {
          params.set('search', next);
        } else {
          params.delete('search');
        }
        params.delete('page');
        return params;
      });
    },
    [setSearchParams],
  );

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
        <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              { label: 'Queues', to: '/' },
              {
                label: (
                  <>
                    <span className="truncate">{queue.display_name || queue.name}</span>
                    {queue.is_paused && (
                      <StatusBadge variant="neutral" icon={CirclePause}>
                        paused
                      </StatusBadge>
                    )}
                  </>
                ),
              },
            ]}
          />
        }
        controls={!queue.read_only_mode && <QueueActions queue={queue} />}
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="candy-card grid divide-y divide-border-subtle rounded-lg md:grid-cols-2 md:divide-x md:divide-y-0">
          <MetricsChart queueName={queue.name} type="completed" />
          <MetricsChart queueName={queue.name} type="failed" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <SearchInput value={search} placeholder="Search by name or id…" onChange={changeSearch} />
        </div>

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
          sortOrder={sort}
          onSortChange={(next) => {
            clearSelection();
            setSearchParams((params) => {
              params.set('sort', next);
              params.delete('page');
              return params;
            });
          }}
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
          queue={queue}
          status={status}
          page={page}
          perPage={perPage}
          onPerPageChange={(next) => {
            clearSelection();
            setSearchParams((params) => {
              params.set('per_page', String(next));
              params.delete('page');
              return params;
            });
          }}
          onChange={(next) => {
            clearSelection();
            setSearchParams((params) => {
              params.set('page', String(next));
              return params;
            });
          }}
        />
      </div>
    </>
  );
}
