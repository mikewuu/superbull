import { addJob } from './handlers/add-job';
import { applyBulkJobAction } from './handlers/apply-bulk-job-action';
import { cleanQueue } from './handlers/clean-queue';
import { drainQueue } from './handlers/drain-queue';
import { emptyQueue } from './handlers/empty-queue';
import { getJob } from './handlers/get-job';
import { getJobLogs } from './handlers/get-job-logs';
import { getPrometheusMetrics } from './handlers/get-prometheus-metrics';
import { getQueueConcurrency } from './handlers/get-queue-concurrency';
import { getQueueJobNames } from './handlers/get-queue-job-names';
import { getQueueMetrics } from './handlers/get-queue-metrics';
import { getQueuePriorities } from './handlers/get-queue-priorities';
import { getQueueStats } from './handlers/get-queue-stats';
import { getQueueWorkers } from './handlers/get-queue-workers';
import { getQueues } from './handlers/get-queues';
import { getRedisStats } from './handlers/get-redis-stats';
import { obliterateQueue } from './handlers/obliterate-queue';
import { pauseQueue } from './handlers/pause-queue';
import { promoteJob } from './handlers/promote-job';
import { promoteQueueJobs } from './handlers/promote-queue-jobs';
import { removeJob } from './handlers/remove-job';
import { renderEntry } from './handlers/render-entry';
import { resumeQueue } from './handlers/resume-queue';
import { retryJob } from './handlers/retry-job';
import { retryQueueJobs } from './handlers/retry-queue-jobs';
import { setQueueConcurrency } from './handlers/set-queue-concurrency';
import { updateJobData } from './handlers/update-job-data';
import type { AppRouteDefs } from './types';

// Order matters: static segments (metrics, add, jobs/bulk) must register
// before the `/:jobId` catch-alls in routers that match in insertion order.
export const appRoutes: AppRouteDefs = {
  entryPoint: {
    method: 'get',
    route: ['/', '/queue/:queueName', '/queue/:queueName/:jobId'],
    handler: renderEntry,
  },
  api: [
    { method: 'get', route: '/api/redis/stats', handler: getRedisStats },
    { method: 'get', route: '/api/prometheus', handler: getPrometheusMetrics },
    { method: 'get', route: '/api/queues', handler: getQueues },
    { method: 'get', route: '/api/queues/:queueName/metrics', handler: getQueueMetrics },
    { method: 'get', route: '/api/queues/:queueName/job-names', handler: getQueueJobNames },
    { method: 'get', route: '/api/queues/:queueName/workers', handler: getQueueWorkers },
    { method: 'get', route: '/api/queues/:queueName/concurrency', handler: getQueueConcurrency },
    { method: 'put', route: '/api/queues/:queueName/concurrency', handler: setQueueConcurrency },
    { method: 'get', route: '/api/queues/:queueName/priorities', handler: getQueuePriorities },
    { method: 'get', route: '/api/queues/:queueName/stats', handler: getQueueStats },
    { method: 'put', route: '/api/queues/:queueName/drain', handler: drainQueue },
    { method: 'put', route: '/api/queues/:queueName/obliterate', handler: obliterateQueue },
    { method: 'post', route: '/api/queues/:queueName/add', handler: addJob },
    { method: 'post', route: '/api/queues/:queueName/jobs/bulk', handler: applyBulkJobAction },
    { method: 'put', route: '/api/queues/:queueName/pause', handler: pauseQueue },
    { method: 'put', route: '/api/queues/:queueName/resume', handler: resumeQueue },
    { method: 'put', route: '/api/queues/:queueName/empty', handler: emptyQueue },
    { method: 'put', route: '/api/queues/:queueName/clean/:status', handler: cleanQueue },
    { method: 'put', route: '/api/queues/:queueName/retry/:status', handler: retryQueueJobs },
    { method: 'put', route: '/api/queues/:queueName/promote', handler: promoteQueueJobs },
    { method: 'get', route: '/api/queues/:queueName/:jobId/logs', handler: getJobLogs },
    { method: 'put', route: '/api/queues/:queueName/:jobId/retry', handler: retryJob },
    { method: 'put', route: '/api/queues/:queueName/:jobId/promote', handler: promoteJob },
    { method: 'put', route: '/api/queues/:queueName/:jobId/clean', handler: removeJob },
    { method: 'patch', route: '/api/queues/:queueName/:jobId/update-data', handler: updateJobData },
    { method: 'get', route: '/api/queues/:queueName/:jobId', handler: getJob },
  ],
};
