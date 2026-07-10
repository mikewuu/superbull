export interface FailureAlert {
  id: string;
  queueName: string;
  deltaCount: number;
  createdMs: number;
}

type Listener = () => void;

let alerts: FailureAlert[] = [];
const listeners = new Set<Listener>();

export function getFailureAlerts(): FailureAlert[] {
  return alerts;
}

export function subscribeFailureAlerts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function addFailureAlert(queueName: string, deltaCount: number): void {
  alerts = [
    ...alerts,
    { id: `${queueName}-${Date.now()}`, queueName, deltaCount, createdMs: Date.now() },
  ];
  notifyFailureAlertListeners();
}

export function dismissFailureAlert(id: string): void {
  alerts = alerts.filter((alert) => alert.id !== id);
  notifyFailureAlertListeners();
}

export function getIncreasedFailureCounts(
  previousCounts: Record<string, number>,
  queues: { name: string; counts: { failed: number } }[],
): { queueName: string; deltaCount: number }[] {
  const increases: { queueName: string; deltaCount: number }[] = [];
  for (const queue of queues) {
    const previous = previousCounts[queue.name];
    if (previous !== undefined && queue.counts.failed > previous) {
      increases.push({ queueName: queue.name, deltaCount: queue.counts.failed - previous });
    }
  }
  return increases;
}

function notifyFailureAlertListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}
