import { useJobLogs } from '../../../hooks/use-job-logs';

interface JobLogsPanelProps {
  queueName: string;
  jobId: string;
}

export function JobLogsPanel(props: JobLogsPanelProps) {
  const { queueName, jobId } = props;
  const { data: logs } = useJobLogs({ queueName, jobId });

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-content-emphasis">Logs</h2>
      {logs && logs.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-muted p-4 font-mono text-xs text-content-default">
          {logs.map((line, index) => (
            <div key={`${index}-${line}`}>{line}</div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-border-subtle bg-bg-muted p-4 text-xs text-content-muted">
          No logs.
        </p>
      )}
    </section>
  );
}
