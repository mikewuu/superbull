import { upsertConnectorByName } from '../lib/connectors/upsert-connector-by-name';
import { recordIngestEvents } from '../lib/ingest/record-ingest-events';
import { upsertStatusPageConfigLegacy } from '../lib/status-pages/upsert-status-page-config-legacy';

const sourceName = 'SuperBull Dev Status Demo';
const slug = 'dev-demo';
const dayMs = 86_400_000;
const backfillDays = 30;
const degradedDaysAgo = 6;
const queueNames = ['dev-demo-send-emails', 'dev-demo-process-videos'];
const eventsPerQueuePerDay = 20;

function guardDevDeployment(): void {
  const deployment = process.env.CONVEX_DEPLOYMENT ?? '';
  if (!deployment.startsWith('dev:')) {
    console.error(
      `refusing to seed: CONVEX_DEPLOYMENT "${deployment}" does not start with "dev:" (this script must only run against a dev Convex deployment)`,
    );
    process.exit(1);
  }
}

function buildDayEvents(args: {
  queueName: string;
  daysAgo: number;
  todayStart: number;
  completed: number;
  failed: number;
}): Array<{ uuid: string; type: string; queueName: string; ts: number }> {
  const { queueName, daysAgo, todayStart, completed, failed } = args;
  const ts = todayStart - daysAgo * dayMs + 3_600_000;
  const events: Array<{ uuid: string; type: string; queueName: string; ts: number }> = [];
  for (let n = 0; n < completed; n++) {
    events.push({
      uuid: `dev-demo-seed-${daysAgo}-${queueName}-completed-${n}`,
      type: 'job.completed',
      queueName,
      ts,
    });
  }
  for (let n = 0; n < failed; n++) {
    events.push({
      uuid: `dev-demo-seed-${daysAgo}-${queueName}-failed-${n}`,
      type: 'job.failed',
      queueName,
      ts,
    });
  }
  return events;
}

async function main(): Promise<void> {
  guardDevDeployment();

  const connector = await upsertConnectorByName({
    name: sourceName,
    url: 'http://127.0.0.1:4655',
    token: 'dev-status-demo-token',
  });

  await upsertStatusPageConfigLegacy({
    connectorId: connector.id,
    slug,
    isEnabled: true,
    title: 'SuperBull Dev Status',
    queueNames,
  });

  const todayStart = Math.floor(Date.now() / dayMs) * dayMs;
  let accepted = 0;
  let deduped = 0;
  for (let daysAgo = 0; daysAgo < backfillDays; daysAgo++) {
    const dayEvents = queueNames.flatMap((queueName) =>
      buildDayEvents(
        daysAgo === degradedDaysAgo
          ? { queueName, daysAgo, todayStart, completed: 3, failed: eventsPerQueuePerDay - 3 }
          : { queueName, daysAgo, todayStart, completed: eventsPerQueuePerDay, failed: 0 },
      ),
    );
    const result = await recordIngestEvents({ connectorId: connector.id, events: dayEvents });
    accepted += result.accepted;
    deduped += result.deduped;
  }

  console.log(`ingest events: ${accepted} accepted, ${deduped} deduped`);
  console.log(`seeded status page: http://localhost:4700/status/${slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
