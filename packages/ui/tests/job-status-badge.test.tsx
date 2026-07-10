import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type JobStatus, jobStatuses } from '../src/job-status';
import { JobStatusBadge } from '../src/job-status-badge';

describe('JobStatusBadge', () => {
  it.each(jobStatuses)('renders a label for the %s status', (status: JobStatus) => {
    render(<JobStatusBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });
});
