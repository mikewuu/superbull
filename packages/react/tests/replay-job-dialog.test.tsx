import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addJob } = vi.hoisted(() => ({ addJob: vi.fn() }));

vi.mock('../src/lib/api-client', () => ({ addJob }));

import { ReplayJobDialog } from '../src/pages/job-detail/_components/replay-job-dialog';

function renderWithClient(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  addJob.mockReset();
});

describe('ReplayJobDialog', () => {
  it('prefills the data textarea with the job payload and keeps the name readonly', () => {
    renderWithClient(
      <ReplayJobDialog
        queueName="send-emails"
        jobName="welcome-email"
        initialData={{ to: 'a@example.com' }}
        showing
        onClose={() => {}}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('welcome-email');
    expect(screen.getByLabelText('Name')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Data (JSON)')).toHaveValue(
      JSON.stringify({ to: 'a@example.com' }, null, 2),
    );
  });

  it('shows an error and does not submit when the edited payload is invalid JSON', async () => {
    const onClose = vi.fn();
    renderWithClient(
      <ReplayJobDialog
        queueName="send-emails"
        jobName="welcome-email"
        initialData={{}}
        showing
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText('Data (JSON)'), { target: { value: '{not json' } });
    await userEvent.click(screen.getByRole('button', { name: 'Replay' }));

    expect(await screen.findByText('Data must be valid JSON.')).toBeInTheDocument();
    expect(addJob).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits the edited payload and closes on success', async () => {
    addJob.mockResolvedValue({ job: {}, status: 'waiting' });
    const onClose = vi.fn();
    renderWithClient(
      <ReplayJobDialog
        queueName="send-emails"
        jobName="welcome-email"
        initialData={{ to: 'a@example.com' }}
        showing
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByLabelText('Data (JSON)'), {
      target: { value: '{"to":"b@example.com"}' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Replay' }));

    expect(addJob).toHaveBeenCalledWith({
      queueName: 'send-emails',
      name: 'welcome-email',
      data: { to: 'b@example.com' },
      options: null,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
