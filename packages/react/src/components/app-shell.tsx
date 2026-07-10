import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router';
import { useQueues } from '../hooks/use-queues';
import { addFailureAlert, getIncreasedFailureCounts } from '../lib/failure-alerts';
import { CommandPalette } from './command-palette';
import { FailureAlertBanner } from './failure-alert-banner';
import { Sidebar } from './sidebar';

export function AppShell() {
  const { data: queues } = useQueues({});
  const previousFailedCountsRef = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    if (!queues) {
      return;
    }
    if (previousFailedCountsRef.current) {
      const increases = getIncreasedFailureCounts(previousFailedCountsRef.current, queues);
      for (const increase of increases) {
        addFailureAlert(increase.queueName, increase.deltaCount);
      }
    }
    previousFailedCountsRef.current = Object.fromEntries(
      queues.map((queue) => [queue.name, queue.counts.failed ?? 0]),
    );
  }, [queues]);

  return (
    <div className="flex h-screen bg-bg-default">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-bg-default">
        <Outlet />
      </main>
      <CommandPalette />
      <FailureAlertBanner />
    </div>
  );
}
