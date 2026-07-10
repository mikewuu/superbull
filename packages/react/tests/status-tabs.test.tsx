import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AppQueue } from '../src/lib/api-types';
import { StatusTabs } from '../src/pages/queue-detail/_components/status-tabs';

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
  };
}

describe('StatusTabs', () => {
  it('renders an "All" tab first for the latest status', () => {
    render(<StatusTabs queue={makeQueue()} status="latest" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('shows a count chip only for statuses with jobs', () => {
    render(<StatusTabs queue={makeQueue()} status="latest" onChange={() => {}} />);
    expect(screen.getByTestId('status-tab-failed')).toHaveTextContent('4');
    expect(screen.getByTestId('status-tab-completed')).toHaveTextContent('3');
  });

  it('calls onChange with the picked status', async () => {
    const onChange = vi.fn();
    render(<StatusTabs queue={makeQueue()} status="latest" onChange={onChange} />);
    await userEvent.click(screen.getByTestId('status-tab-failed'));
    expect(onChange).toHaveBeenCalledWith('failed');
  });
});
