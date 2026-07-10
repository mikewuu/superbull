import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppQueue } from '../src/lib/api-types';

const { getQueues, navigateMock } = vi.hoisted(() => ({
  getQueues: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('../src/lib/api-client', () => ({ getQueues }));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({}) };
});

import { CommandPalette } from '../src/components/command-palette';

function makeQueue(name: string): AppQueue {
  return {
    name,
    counts: {
      active: 0,
      waiting: 0,
      'waiting-children': 0,
      prioritized: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    },
    jobs: [],
    statuses: ['latest'],
    pagination: { page_count: 1, range: { start: 0, end: 0 } },
    read_only_mode: false,
    allow_retries: true,
    allow_completed_retries: true,
    is_paused: false,
    worker_count: 0,
    oldest_waiting_ms: null,
  };
}

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  getQueues.mockReset();
  navigateMock.mockReset();
});

describe('CommandPalette', () => {
  it('opens on ctrl+k and lists queues to navigate to', async () => {
    getQueues.mockResolvedValue([makeQueue('send-emails'), makeQueue('process-videos')]);
    renderWithClient(<CommandPalette />);

    expect(screen.queryByPlaceholderText(/Jump to a queue/)).not.toBeInTheDocument();
    await userEvent.keyboard('{Control>}k{/Control}');

    expect(await screen.findByPlaceholderText(/Jump to a queue/)).toBeVisible();
    await waitFor(() => expect(screen.getByText('Go to send-emails')).toBeInTheDocument());
    expect(screen.getByText('Go to process-videos')).toBeInTheDocument();
  });

  it('navigates to the selected queue and closes', async () => {
    getQueues.mockResolvedValue([makeQueue('send-emails')]);
    renderWithClient(<CommandPalette />);

    await userEvent.keyboard('{Control>}k{/Control}');
    const item = await screen.findByText('Go to send-emails');
    await userEvent.click(item);

    expect(navigateMock).toHaveBeenCalledWith('/queue/send-emails');
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Jump to a queue/)).not.toBeInTheDocument(),
    );
  });

  it('filters items by fuzzy search text', async () => {
    getQueues.mockResolvedValue([makeQueue('send-emails'), makeQueue('process-videos')]);
    renderWithClient(<CommandPalette />);

    await userEvent.keyboard('{Control>}k{/Control}');
    await screen.findByText('Go to send-emails');

    await userEvent.type(screen.getByPlaceholderText(/Jump to a queue/), 'process');

    await waitFor(() => expect(screen.queryByText('Go to send-emails')).not.toBeInTheDocument());
    expect(screen.getByText('Go to process-videos')).toBeInTheDocument();
  });
});
