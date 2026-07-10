import {
  CircleAlert,
  CircleArrowUp,
  CircleCheck,
  CircleDashed,
  CircleDotDashed,
  CirclePause,
  CirclePlay,
  Clock,
} from 'lucide-react';
import type { JobStatus } from './job-status';
import { StatusBadge } from './status-badge';

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge(props: JobStatusBadgeProps) {
  const { status } = props;

  if (status === 'completed') {
    return (
      <StatusBadge variant="success" icon={CircleCheck}>
        completed
      </StatusBadge>
    );
  }
  if (status === 'failed') {
    return (
      <StatusBadge variant="error" icon={CircleAlert}>
        failed
      </StatusBadge>
    );
  }
  if (status === 'active') {
    return (
      <StatusBadge variant="new" icon={CirclePlay}>
        active
      </StatusBadge>
    );
  }
  if (status === 'delayed') {
    return (
      <StatusBadge variant="new" icon={Clock}>
        delayed
      </StatusBadge>
    );
  }
  if (status === 'prioritized') {
    return (
      <StatusBadge variant="new" icon={CircleArrowUp}>
        prioritized
      </StatusBadge>
    );
  }
  if (status === 'paused') {
    return (
      <StatusBadge variant="neutral" icon={CirclePause}>
        paused
      </StatusBadge>
    );
  }
  if (status === 'waiting-children') {
    return (
      <StatusBadge variant="neutral" icon={CircleDotDashed}>
        waiting-children
      </StatusBadge>
    );
  }
  return (
    <StatusBadge variant="neutral" icon={CircleDashed}>
      waiting
    </StatusBadge>
  );
}
