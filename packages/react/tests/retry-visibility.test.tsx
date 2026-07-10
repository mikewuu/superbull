import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { AppJob, AppQueue } from '../src/lib/api-types';
import { JobTable } from '../src/pages/queue-detail/_components/job-table';

function makeFailedJob(): AppJob {
  return {
    id: '1',
    name: 'doomed',
    timestamp: Date.now(),
    processed_on: Date.now(),
    finished_on: Date.now(),
    progress: 0,
    attempts: 1,
    failed_reason: 'deliberate failure',
    stacktrace: [],
    delay: undefined,
    opts: {},
    data: {},
    return_value: null,
    is_failed: true,
  };
}

function makeQueue(overrides: Partial<AppQueue>): AppQueue {
  return {
    name: 'send-emails',
    counts: {
      active: 0,
      waiting: 0,
      'waiting-children': 0,
      prioritized: 0,
      completed: 0,
      failed: 1,
      delayed: 0,
      paused: 0,
    },
    jobs: [makeFailedJob()],
    statuses: ['failed'],
    pagination: { page_count: 1, range: { start: 0, end: 0 } },
    read_only_mode: false,
    allow_retries: true,
    allow_completed_retries: true,
    is_paused: false,
    worker_count: 0,
    oldest_waiting_ms: null,
    ...overrides,
  };
}

function renderTable(queue: AppQueue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const providers = (children: ReactNode) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
  return render(
    providers(
      <JobTable
        queue={queue}
        selectedStatus="failed"
        selectedIds={new Set()}
        sortOrder="desc"
        onToggle={() => {}}
        onToggleAll={() => {}}
        onSortChange={() => {}}
      />,
    ),
  );
}

describe('retry visibility', () => {
  it('shows the quick retry on a failed row when retries are allowed', () => {
    renderTable(makeQueue({}));
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('hides the quick retry when retries are disabled for the queue', () => {
    renderTable(makeQueue({ allow_retries: false, allow_completed_retries: false }));
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});
