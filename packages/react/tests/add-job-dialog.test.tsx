import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addJob } = vi.hoisted(() => ({ addJob: vi.fn() }));

vi.mock('../src/lib/api-client', () => ({ addJob }));

import { AddJobDialog } from '../src/pages/queue-detail/_components/add-job-dialog';

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  addJob.mockReset();
});

async function switchToBulk() {
  await userEvent.click(screen.getByTestId('add-job-mode-bulk'));
}

function fillBulkTextarea(value: string) {
  fireEvent.change(screen.getByLabelText(/Jobs — JSON array/), { target: { value } });
}

describe('AddJobDialog bulk mode', () => {
  it('rejects an invalid bulk payload up front without calling the add endpoint', async () => {
    renderWithClient(<AddJobDialog queueName="send-emails" showing onClose={() => {}} />);
    await switchToBulk();

    fillBulkTextarea('[{"data":{}}]');
    await userEvent.click(screen.getByRole('button', { name: 'Add jobs' }));

    expect(await screen.findByText(/index 0/)).toBeInTheDocument();
    expect(addJob).not.toHaveBeenCalled();
  });

  it('adds every job sequentially and closes on full success', async () => {
    addJob.mockResolvedValue({ job: {}, status: 'waiting' });
    const onClose = vi.fn();
    renderWithClient(<AddJobDialog queueName="send-emails" showing onClose={onClose} />);
    await switchToBulk();

    fillBulkTextarea('[{"name":"a","data":{}},{"name":"b","data":{}},{"name":"c","data":{}}]');
    await userEvent.click(screen.getByRole('button', { name: 'Add jobs' }));

    await waitFor(() => expect(addJob).toHaveBeenCalledTimes(3));
    expect(addJob).toHaveBeenNthCalledWith(1, {
      queueName: 'send-emails',
      name: 'a',
      data: {},
      options: null,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('reports the offending index and stops when a submission fails partway through', async () => {
    addJob
      .mockResolvedValueOnce({ job: {}, status: 'waiting' })
      .mockRejectedValueOnce(new Error('boom'));
    renderWithClient(<AddJobDialog queueName="send-emails" showing onClose={() => {}} />);
    await switchToBulk();

    fillBulkTextarea('[{"name":"a","data":{}},{"name":"b","data":{}}]');
    await userEvent.click(screen.getByRole('button', { name: 'Add jobs' }));

    expect(await screen.findByText(/Failed adding job at index 1/)).toBeInTheDocument();
    expect(addJob).toHaveBeenCalledTimes(2);
  });
});
