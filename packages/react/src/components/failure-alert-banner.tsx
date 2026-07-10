import { useSyncExternalStore } from 'react';
import { getFailureAlerts, subscribeFailureAlerts } from '../lib/failure-alerts';
import { FailureAlertCard } from './failure-alert-card';

export function FailureAlertBanner() {
  const alerts = useSyncExternalStore(subscribeFailureAlerts, getFailureAlerts, getFailureAlerts);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {alerts.map((alert) => (
        <FailureAlertCard
          key={alert.id}
          id={alert.id}
          queueName={alert.queueName}
          deltaCount={alert.deltaCount}
        />
      ))}
    </div>
  );
}
