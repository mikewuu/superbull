import path from 'node:path';
import { env } from '../lib/config/env';

process.env.REDIS_HOST = env.REDIS_URL;

async function main() {
  const { scheduleJobs, work } = await import('@nextastic/queue');
  const { evaluateAlerts } = await import('../jobs/evaluate-alerts');
  const { sendDailyDigest } = await import('../jobs/send-daily-digest');
  const { queues } = await import('../lib/queue/config');

  await scheduleJobs({
    queues,
    schedule: async () => {
      await evaluateAlerts.dispatch({}, { repeat: { pattern: '*/5 * * * *' } });
      await sendDailyDigest.dispatch({}, { repeat: { pattern: '0 9 * * *' } });
    },
  });

  await work({ queues, jobsDir: path.join(__dirname, '../jobs') });
}

void main();
