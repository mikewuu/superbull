import type { AppJob, QueueJob } from './types';

export function formatJob(job: QueueJob): AppJob {
  const jobJson = job.toJSON();
  const stacktrace = (jobJson.stacktrace ?? []).filter(Boolean).reverse();

  return {
    id: jobJson.id,
    name: jobJson.name || '',
    timestamp: jobJson.timestamp,
    processed_on: jobJson.processedOn,
    finished_on: jobJson.finishedOn,
    progress: jobJson.progress,
    attempts: jobJson.attemptsMade,
    failed_reason: jobJson.failedReason,
    stacktrace,
    delay: jobJson.delay,
    opts: jobJson.opts,
    data: jobJson.data,
    return_value: jobJson.returnvalue,
    is_failed: !!jobJson.failedReason || stacktrace.length > 0,
  };
}
