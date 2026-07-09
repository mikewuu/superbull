import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JobStatusBadge } from '../src/components/job-status-badge';
import { type JobStatus, jobStatuses } from '../src/lib/api-types';

describe('JobStatusBadge', () => {
  it.each(jobStatuses)('renders a label for the %s status', (status: JobStatus) => {
    render(<JobStatusBadge status={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });
});
