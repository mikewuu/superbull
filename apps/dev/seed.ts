import { type Job, MetricsTime, Queue, Worker } from 'bullmq';

const host = process.env.REDIS_HOST ?? '127.0.0.1';
const port = Number(process.env.REDIS_PORT ?? 6379);
const connection = { host, port };
const live = process.argv.includes('--live');

const emailNames = ['welcome-email', 'password-reset', 'weekly-digest', 'invoice-receipt'];
const videoNames = ['transcode-1080p', 'generate-thumbnails', 'extract-captions'];

async function main() {
  const sendEmails = new Queue('send-emails', { connection });
  const processVideos = new Queue('process-videos', { connection });
  const syncContacts = new Queue('sync-contacts', { connection });

  console.log('obliterating previous demo state…');
  for (const queue of [sendEmails, processVideos, syncContacts]) {
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.resume().catch(() => undefined);
  }

  console.log('processing seed jobs…');
  const emailWorker = makeEmailWorker();
  const videoWorker = makeVideoWorker();

  await addAndDrain(sendEmails, [
    ...Array.from({ length: 24 }, (_, index) => ({
      name: emailNames[index % emailNames.length] ?? 'welcome-email',
      data: { to: `user${index + 1}@example.com`, template: 'default' },
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      name: 'bounce-notification',
      data: { to: `bounced${index + 1}@example.com`, fail: true },
    })),
  ]);

  await addAndDrain(
    processVideos,
    Array.from({ length: 10 }, (_, index) => ({
      name: videoNames[index % videoNames.length] ?? 'transcode-1080p',
      data: { video_id: `vid_${1000 + index}`, resolution: '1080p', fail: index % 5 === 4 },
    })),
  );

  await emailWorker.close();
  await videoWorker.close();

  console.log('adding waiting, delayed and prioritized jobs…');
  await sendEmails.addBulk(
    Array.from({ length: 8 }, (_, index) => ({
      name: 'weekly-digest',
      data: { to: `subscriber${index + 1}@example.com` },
    })),
  );
  await sendEmails.addBulk(
    Array.from({ length: 5 }, (_, index) => ({
      name: 'scheduled-campaign',
      data: { campaign: 'spring-sale' },
      opts: { delay: (index + 1) * 600_000 },
    })),
  );
  await processVideos.addBulk(
    Array.from({ length: 3 }, (_, index) => ({
      name: 'rush-transcode',
      data: { video_id: `vip_${index + 1}` },
      opts: { priority: index + 1 },
    })),
  );

  await syncContacts.addBulk(
    Array.from({ length: 4 }, (_, index) => ({
      name: 'sync-hubspot',
      data: { account_id: `acct_${index + 1}` },
    })),
  );
  await syncContacts.pause();

  console.log('seeded: send-emails (24 completed, 6 failed, 8 waiting, 5 delayed)');
  console.log('seeded: process-videos (8 completed, 2 failed, 3 prioritized)');
  console.log('seeded: sync-contacts (paused, 4 waiting)');

  if (live) {
    console.log('live mode: trickling jobs into send-emails every 5s…');
    const liveWorker = makeEmailWorker();
    setInterval(() => {
      const index = Math.floor(Math.random() * emailNames.length);
      sendEmails.add(emailNames[index] ?? 'welcome-email', {
        to: `live${Date.now()}@example.com`,
        fail: Math.random() < 0.15,
      });
    }, 5000);
    process.on('SIGINT', async () => {
      await liveWorker.close();
      process.exit(0);
    });
    return;
  }

  await sendEmails.close();
  await processVideos.close();
  await syncContacts.close();
  process.exit(0);
}

function makeEmailWorker(): Worker {
  return new Worker(
    'send-emails',
    async (job: Job) => {
      await job.log(`rendering template for ${job.data.to}`);
      await sleep(30);
      if (job.data.fail) {
        throw new Error(`SMTP 550: mailbox unavailable for ${job.data.to}`);
      }
      await job.log('delivered via smtp relay');
      return { delivered: true, to: job.data.to };
    },
    { connection, concurrency: 8, metrics: { maxDataPoints: MetricsTime.ONE_WEEK } },
  );
}

function makeVideoWorker(): Worker {
  return new Worker(
    'process-videos',
    async (job: Job) => {
      for (const percent of [20, 45, 70, 90]) {
        await job.updateProgress(percent);
        await sleep(20);
      }
      await job.log(`ffmpeg pass complete for ${job.data.video_id}`);
      if (job.data.fail) {
        throw new Error(`ffmpeg exited with code 1: corrupt moov atom in ${job.data.video_id}`);
      }
      await job.updateProgress(100);
      return { output: `s3://videos/${job.data.video_id}.mp4` };
    },
    { connection, concurrency: 4, metrics: { maxDataPoints: MetricsTime.ONE_WEEK } },
  );
}

async function addAndDrain(
  queue: Queue,
  jobs: Array<{ name: string; data: Record<string, unknown> }>,
): Promise<void> {
  await queue.addBulk(jobs.map((job) => ({ ...job, opts: { attempts: 1 } })));
  await waitForDrain(queue);
}

async function waitForDrain(queue: Queue): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt++) {
    const counts = await queue.getJobCounts('waiting', 'active', 'prioritized');
    const pending = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.prioritized ?? 0);
    if (pending === 0) {
      return;
    }
    await sleep(100);
  }
  throw new Error(`queue ${queue.name} did not drain in time`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
