import type { AppJob, JobStatus, QueueStatus } from './api-types';

export function getJobStatus(job: AppJob, selectedStatus: QueueStatus): JobStatus {
  if (selectedStatus !== 'latest') {
    return selectedStatus;
  }
  if (job.is_failed && job.finished_on) {
    return 'failed';
  }
  if (job.finished_on) {
    return 'completed';
  }
  if (job.processed_on) {
    return 'active';
  }
  if (job.delay && job.delay > 0) {
    return 'delayed';
  }
  return 'waiting';
}
