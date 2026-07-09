import { addJob } from './handlers/add-job';
import { applyBulkJobAction } from './handlers/apply-bulk-job-action';
import { cleanQueue } from './handlers/clean-queue';
import { emptyQueue } from './handlers/empty-queue';
import { getJob } from './handlers/get-job';
import { getJobLogs } from './handlers/get-job-logs';
import { getQueueMetrics } from './handlers/get-queue-metrics';
import { getQueues } from './handlers/get-queues';
import { getRedisStats } from './handlers/get-redis-stats';
import { pauseQueue } from './handlers/pause-queue';
import { promoteJob } from './handlers/promote-job';
import { promoteQueueJobs } from './handlers/promote-queue-jobs';
import { removeJob } from './handlers/remove-job';
import { renderEntry } from './handlers/render-entry';
import { resumeQueue } from './handlers/resume-queue';
import { retryJob } from './handlers/retry-job';
import { retryQueueJobs } from './handlers/retry-queue-jobs';
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
    { method: 'get', route: '/api/queues', handler: getQueues },
    { method: 'get', route: '/api/queues/:queueName/metrics', handler: getQueueMetrics },
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
