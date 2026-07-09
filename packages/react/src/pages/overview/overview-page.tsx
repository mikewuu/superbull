import { PageHeader } from '../../components/page-header';
import { useQueues } from '../../hooks/use-queues';
import { QueueCard } from './_components/queue-card';
import { RedisStatsCard } from './_components/redis-stats-card';

export function OverviewPage() {
  const { data: queues, error } = useQueues({});

  return (
    <>
      <PageHeader title="Queues" />
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-5 px-3 py-6 lg:px-6">
        {error && (
          <p className="text-sm text-content-error">Failed to load queues: {error.message}</p>
        )}
        <RedisStatsCard />
        <div className="grid gap-5 md:grid-cols-2">
          {queues?.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))}
        </div>
        {queues?.length === 0 && (
          <p className="text-sm text-content-subtle">No queues registered.</p>
        )}
      </div>
    </>
  );
}
