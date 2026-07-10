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
  it('opens a picker with per-status counts and an all-statuses total', async () => {
    render(<StatusFilter queue={makeQueue()} statuses={[]} onChange={() => {}} />);
    await userEvent.click(screen.getByTestId('status-filter-button'));
    expect(screen.getByTestId('status-tab-latest')).toHaveTextContent('10');
    expect(screen.getByTestId('status-tab-failed')).toHaveTextContent('4');
    expect(screen.getByTestId('status-tab-completed')).toHaveTextContent('3');
  });

  it('toggles statuses into the selection without closing', async () => {
    const onChange = vi.fn();
    render(<StatusFilter queue={makeQueue()} statuses={['failed']} onChange={onChange} />);
    await userEvent.click(screen.getByTestId('status-filter-button'));
    await userEvent.click(screen.getByTestId('status-tab-completed'));
    expect(onChange).toHaveBeenCalledWith(['failed', 'completed']);
    expect(screen.getByTestId('status-tab-latest')).toBeVisible();
  });

  it('deselects an already-selected status', async () => {
    const onChange = vi.fn();
    render(<StatusFilter queue={makeQueue()} statuses={['failed']} onChange={onChange} />);
    await userEvent.click(screen.getByTestId('status-filter-button'));
    await userEvent.click(screen.getByTestId('status-tab-failed'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('renders a removable chip per selected status', async () => {
    const onChange = vi.fn();
    render(
      <StatusFilter queue={makeQueue()} statuses={['failed', 'completed']} onChange={onChange} />,
    );
    expect(screen.getByTestId('applied-status-failed')).toHaveTextContent('failed');
    expect(screen.getByTestId('applied-status-completed')).toHaveTextContent('completed');
    await userEvent.click(screen.getByLabelText('Remove failed filter'));
    expect(onChange).toHaveBeenCalledWith(['completed']);
  });

  it('clears everything via all statuses', async () => {
    const onChange = vi.fn();
    render(<StatusFilter queue={makeQueue()} statuses={['failed']} onChange={onChange} />);
    await userEvent.click(screen.getByTestId('status-filter-button'));
    await userEvent.click(screen.getByTestId('status-tab-latest'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
