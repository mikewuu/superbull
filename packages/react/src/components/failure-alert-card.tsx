import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';
import { dismissFailureAlert } from '../lib/failure-alerts';

const autoDismissMs = 10_000;

interface FailureAlertCardProps {
  id: string;
  queueName: string;
  deltaCount: number;
}

export function FailureAlertCard(props: FailureAlertCardProps) {
  const { id, queueName, deltaCount } = props;

  useEffect(() => {
    const timer = setTimeout(() => dismissFailureAlert(id), autoDismissMs);
    return () => clearTimeout(timer);
  }, [id]);

  return (
    <div
      data-testid="failure-alert"
      className="candy-card flex w-72 animate-fade-in items-center gap-3 rounded-lg border-red-200 bg-bg-error px-3 py-2.5 shadow-lg"
    >
      <AlertTriangle className="size-4 shrink-0 text-content-error" />
      <span className="flex-1 text-sm text-content-error">
        {queueName}: +{deltaCount} failed
      </span>
      <button
        type="button"
        aria-label="Dismiss alert"
        onClick={() => dismissFailureAlert(id)}
        className="rounded p-0.5 text-content-error hover:bg-red-200/50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
