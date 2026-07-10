import { AttemptCard } from './attempt-card';

interface AttemptsPanelProps {
  stacktrace: string[];
}

export function AttemptsPanel(props: AttemptsPanelProps) {
  const { stacktrace } = props;

  if (stacktrace.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="border-b border-t border-border-subtle px-4 py-2 text-2sm font-medium text-content-emphasis">
        Attempts
      </h2>
      <div className="flex flex-col divide-y divide-border-subtle">
        {stacktrace.map((trace, index) => (
          <AttemptCard
            key={`attempt-${index}-${trace.length}`}
            attemptNumber={index + 1}
            trace={trace}
          />
        ))}
      </div>
    </div>
  );
}
