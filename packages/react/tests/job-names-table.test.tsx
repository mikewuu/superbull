import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobNameStats } from '../src/lib/api-types';

const { getJobNames } = vi.hoisted(() => ({
  getJobNames: vi.fn(),
}));

vi.mock('../src/lib/api-client', () => ({ getJobNames }));

import { JobNamesTable } from '../src/pages/queue-detail/_components/job-names-table';

function makeJobName(overrides: Partial<JobNameStats> = {}): JobNameStats {
  return {
    name: 'welcome-email',
    completed_count: 24,
    failed_count: 6,
    pending_count: 2,
    failure_rate: 0.2,
    avg_duration_ms: 1500,
    last_seen_ms: Date.now(),
    activity: new Array(24).fill(0),
    ...overrides,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  getJobNames.mockReset();
});

describe('JobNamesTable', () => {
  it('renders job name, counts and failure rate', async () => {
    getJobNames.mockResolvedValue([makeJobName()]);
    renderWithClient(<JobNamesTable queueName="send-emails" onRun={() => {}} />);

    expect(await screen.findByText('welcome-email')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
  });

  it('calls onRun with the job name when Run is clicked', async () => {
    getJobNames.mockResolvedValue([makeJobName()]);
    const onRun = vi.fn();
    renderWithClient(<JobNamesTable queueName="send-emails" onRun={onRun} />);

    await screen.findByText('welcome-email');
    await userEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(onRun).toHaveBeenCalledWith('welcome-email');
  });

  it('shows an empty state when there are no job names', async () => {
    getJobNames.mockResolvedValue([]);
    renderWithClient(<JobNamesTable queueName="send-emails" onRun={() => {}} />);

    expect(await screen.findByText('No jobs yet')).toBeInTheDocument();
    expect(screen.getByText('Add a job to see its name aggregated here.')).toBeInTheDocument();
  });
});
