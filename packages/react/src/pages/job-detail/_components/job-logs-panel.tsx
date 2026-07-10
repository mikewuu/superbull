import { useJobLogs } from '../../../hooks/use-job-logs';
import { cn } from '../../../lib/cn';

interface JobLogsPanelProps {
  queueName: string;
  jobId: string;
}

export function JobLogsPanel(props: JobLogsPanelProps) {
  const { queueName, jobId } = props;
  const { data: logs } = useJobLogs({ queueName, jobId });

  return (
    <div>
      <div className="flex items-center justify-between border-b border-t border-border-subtle px-4 py-2">
        <h2 className="text-2sm font-medium text-content-emphasis">Logs</h2>
        {logs && logs.length > 0 && (
          <span className="font-mono text-xs text-content-muted">{logs.length}</span>
        )}
      </div>
      {logs && logs.length > 0 ? (
        logs.map((line, index) => (
          <div
            key={`${index}-${line}`}
            className={cn('grid grid-cols-[2rem_1fr] gap-2 px-4 py-1 font-mono text-xs', {
              'bg-bg-muted/50': index % 2 === 1,
            })}
          >
            <span className="select-none text-right text-content-muted">{index + 1}</span>
            <span className="whitespace-pre-wrap text-content-default">{line}</span>
          </div>
        ))
      ) : (
        <p className="px-4 py-6 text-xs text-content-muted">No logs for this job.</p>
      )}
    </div>
  );
}
