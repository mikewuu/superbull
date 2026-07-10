import path from 'node:path';
import { type Queue, scheduleJobs, work } from '@nextastic/queue';
import { evaluateAlerts } from '../jobs/evaluate-alerts';
import { sendDigest } from '../jobs/send-digest';

const queues: Queue[] = [{ name: 'default', concurrency: 5 }];

async function main() {
  await scheduleJobs({
    queues,
    schedule: async () => {
      await evaluateAlerts.dispatch({}, { repeat: { pattern: '*/5 * * * *' } });
      await sendDigest.dispatch({}, { repeat: { pattern: '0 9 * * *' } });
    },
  });

  const jobsDir = path.join(__dirname, '../jobs');
  await work({ queues, jobsDir });
}

void main();
