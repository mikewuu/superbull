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
  };
}

describe('StatusFilter', () => {
  it('always offers a "latest" option first', () => {
    render(<StatusFilter queue={makeQueue()} status="latest" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /latest/ })).toBeInTheDocument();
  });

  it('shows the count next to each concrete status', () => {
    render(<StatusFilter queue={makeQueue()} status="latest" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /failed 4/ })).toBeInTheDocument();
  });

  it('calls onChange with the picked status', async () => {
    const onChange = vi.fn();
    render(<StatusFilter queue={makeQueue()} status="latest" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /failed 4/ }));
    expect(onChange).toHaveBeenCalledWith('failed');
  });
});
