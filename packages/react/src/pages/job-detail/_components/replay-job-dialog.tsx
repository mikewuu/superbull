import { Button, Dialog } from '@bullwatch/ui';
import { useState } from 'react';
import { useReplayJob } from '../../../hooks/use-replay-job';

interface ReplayJobDialogProps {
  queueName: string;
  jobName: string;
  initialData: unknown;
  showing: boolean;
  onClose: () => void;
}

export function ReplayJobDialog(props: ReplayJobDialogProps) {
  const { queueName, jobName, initialData, showing, onClose } = props;
  const [dataText, setDataText] = useState(() => JSON.stringify(initialData, null, 2));
  const [dataError, setDataError] = useState('');
  const replayJob = useReplayJob();

  const submit = () => {
    let data: unknown;
    try {
      data = JSON.parse(dataText);
    } catch {
      setDataError('Data must be valid JSON.');
      return;
    }
    setDataError('');
    replayJob.mutate({ queueName, jobName, data }, { onSuccess: onClose });
  };

  return (
    <Dialog showing={showing} onClose={onClose} title="Replay with edited payload">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-content-subtle">Name</span>
          <input
            type="text"
            value={jobName}
            readOnly
            className="h-9 rounded-lg border-border-subtle bg-bg-muted text-sm text-content-muted focus:border-border-subtle focus:ring-0"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-content-subtle">Data (JSON)</span>
          <textarea
            value={dataText}
            rows={8}
            onChange={(event) => setDataText(event.target.value)}
            className="rounded-lg border-border-subtle font-mono text-xs text-content-emphasis focus:border-border-emphasis focus:ring-0"
          />
          {dataError && <span className="text-xs text-content-error">{dataError}</span>}
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="h-9" text="Cancel" onClick={onClose} />
          <Button className="h-9" text="Replay" loading={replayJob.isPending} onClick={submit} />
        </div>
      </div>
    </Dialog>
  );
}
