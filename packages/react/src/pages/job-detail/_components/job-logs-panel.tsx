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
      <h2 className="text-2sm font-medium text-content-emphasis">Logs</h2>
      {logs && logs.length > 0 ? (
        <div className="candy-card overflow-x-auto rounded-lg p-4">
          {logs.map((line, index) => (
            <div key={`${index}-${line}`} className="flex gap-3 font-mono text-xs leading-5">
              <span className="w-6 shrink-0 select-none text-right text-content-muted">
                {index + 1}
              </span>
              <span className="whitespace-pre-wrap text-content-default">{line}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="candy-card rounded-lg p-4 text-xs text-content-muted">
          No logs for this job.
        </p>
      )}
    </section>
  );
}
