import { PageHeader, SearchInput, Skeleton, StatusBadge, cn } from '@superbull/ui';
import { CirclePause } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Breadcrumbs } from '../../components/breadcrumbs';
import { useDocumentTitle } from '../../hooks/use-document-title';
import { useQueues } from '../../hooks/use-queues';
import { type JobStatus, jobStatuses } from '../../lib/api-types';
import { AddJobDialog } from './_components/add-job-dialog';
import { BulkActionsBar } from './_components/bulk-actions-bar';
import { CreatedAfterFilter } from './_components/created-after-filter';
import { JobNamesTable } from './_components/job-names-table';
import { JobTable } from './_components/job-table';
import { MetricsChart } from './_components/metrics-chart';
import { QueueActions } from './_components/queue-actions';
import { QueueInsights } from './_components/queue-insights';
import { QueuePagination } from './_components/queue-pagination';
import { StatusFilter } from './_components/status-filter';

type QueueDetailView = 'runs' | 'names';

export function QueueDetailPage() {
  const { queueName = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [runJobName, setRunJobName] = useState<string | null>(null);

  const statuses = readSelectedStatuses(searchParams.get('status'));
  const search = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
  const perPage = Number(searchParams.get('per_page') ?? '10');
  const view = readSelectedView(searchParams.get('view'));
  const createdAfterMs = Number(searchParams.get('created_after')) || null;

  const changeCreatedAfter = (createdAfter: number | null) => {
    setSearchParams((params) => {
      if (createdAfter) {
        params.set('created_after', String(createdAfter));
      } else {
        params.delete('created_after');
      }
      return params;
    });
  };

  const changeView = (next: QueueDetailView) => {
    setSearchParams((params) => {
      if (next === 'runs') {
        params.delete('view');
      } else {
        params.set('view', next);
      }
      return params;
    });
  };

  const { data: queues, error } = useQueues({
    activeQueue: queueName,
    status: statuses.length > 0 ? statuses.join(',') : undefined,
    page,
    sort,
    perPage,
    search: search || undefined,
  });
  const queue = queues?.find((candidate) => candidate.name === queueName);
  useDocumentTitle(queue?.display_name || queueName);

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

  const filteredJobs = createdAfterMs
    ? queue.jobs.filter((job) => job.timestamp >= createdAfterMs)
    : queue.jobs;
  const jobTableQueue = createdAfterMs ? { ...queue, jobs: filteredJobs } : queue;

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

        <QueueInsights queueName={queue.name} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 rounded-lg border border-border-subtle p-0.5">
              <button
                type="button"
                data-testid="view-runs"
                onClick={() => changeView('runs')}
                className={cn('h-7 rounded-md px-3 text-2sm', {
                  'bg-bg-inverted font-medium text-white': view === 'runs',
                  'text-content-subtle hover:text-content-emphasis': view !== 'runs',
                })}
              >
                Runs
              </button>
              <button
                type="button"
                data-testid="view-names"
                onClick={() => changeView('names')}
                className={cn('h-7 rounded-md px-3 text-2sm', {
                  'bg-bg-inverted font-medium text-white': view === 'names',
                  'text-content-subtle hover:text-content-emphasis': view !== 'names',
                })}
              >
                Jobs
              </button>
            </div>
            {view === 'runs' && (
              <StatusFilter
                queue={queue}
                statuses={statuses}
                onChange={(next) => {
                  clearSelection();
                  setSearchParams((params) => {
                    if (next.length > 0) {
                      params.set('status', next.join(','));
                    } else {
                      params.delete('status');
                    }
                    params.delete('page');
                    return params;
                  });
                }}
              />
            )}
            {view === 'runs' && (
              <>
                <CreatedAfterFilter onChange={changeCreatedAfter} />
                {createdAfterMs && (
                  <span className="text-xs text-content-muted">(filtered from current page)</span>
                )}
              </>
            )}
          </div>
          {view === 'runs' && (
            <SearchInput
              value={search}
              placeholder="Search by name or id…"
              onChange={changeSearch}
            />
          )}
        </div>

        {view === 'names' ? (
          <JobNamesTable queueName={queue.name} onRun={setRunJobName} />
        ) : (
          <>
            {selectedIds.size > 0 && (
              <BulkActionsBar
                queueName={queue.name}
                selectedIds={[...selectedIds]}
                allowRetries={queue.allow_retries}
                onDone={clearSelection}
              />
            )}

            <JobTable
              queue={jobTableQueue}
              selectedStatus={statuses.length === 1 && statuses[0] ? statuses[0] : 'latest'}
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
              status={statuses.length === 1 && statuses[0] ? statuses[0] : 'latest'}
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
          </>
        )}
      </div>

      <AddJobDialog
        key={runJobName ?? 'blank'}
        queueName={queue.name}
        initialName={runJobName ?? undefined}
        showing={runJobName !== null}
        onClose={() => setRunJobName(null)}
      />
    </>
  );
}

function readSelectedStatuses(value: string | null): JobStatus[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .filter((entry): entry is JobStatus => jobStatuses.includes(entry as JobStatus));
}

function readSelectedView(value: string | null): QueueDetailView {
  return value === 'names' ? 'names' : 'runs';
}
