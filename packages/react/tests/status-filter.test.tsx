import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AppQueue } from '../src/lib/api-types';
import { StatusFilter } from '../src/pages/queue-detail/_components/status-filter';

function makeQueue(): AppQueue {
  return {
    name: 'emails',
    counts: {
      active: 1,
      waiting: 2,
      'waiting-children': 0,
      prioritized: 0,
      completed: 3,
      failed: 4,
      delayed: 0,
      paused: 0,
    },
    jobs: [],
    statuses: ['latest', 'active', 'completed', 'failed'],
    pagination: { page_count: 1, range: { start: 0, end: 0 } },
    read_only_mode: false,
    allow_retries: true,
    allow_completed_retries: true,
    is_paused: false,
    worker_count: 0,
    oldest_waiting_ms: null,
  };
}

describe('StatusFilter', () => {
  it('opens a picker with per-status counts', async () => {
    render(<StatusFilter queue={makeQueue()} status="latest" onChange={() => {}} />);
    await userEvent.click(screen.getByTestId('status-filter-button'));
    expect(screen.getByTestId('status-tab-failed')).toHaveTextContent('4');
    expect(screen.getByTestId('status-tab-completed')).toHaveTextContent('3');
  });

  it('calls onChange with the picked status', async () => {
    const onChange = vi.fn();
    render(<StatusFilter queue={makeQueue()} status="latest" onChange={onChange} />);
    await userEvent.click(screen.getByTestId('status-filter-button'));
    await userEvent.click(screen.getByTestId('status-tab-failed'));
    expect(onChange).toHaveBeenCalledWith('failed');
  });

  it('shows a removable applied pill for a concrete status', async () => {
    const onChange = vi.fn();
    render(<StatusFilter queue={makeQueue()} status="failed" onChange={onChange} />);
    expect(screen.getByTestId('applied-status')).toHaveTextContent('failed');
    await userEvent.click(screen.getByLabelText('Clear status filter'));
    expect(onChange).toHaveBeenCalledWith('latest');
  });
});
