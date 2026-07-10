import { Button, Dialog } from '@bullwatch/ui';
import { useState } from 'react';
import { useAddJob } from '../../../hooks/use-add-job';

interface AddJobDialogProps {
  queueName: string;
  showing: boolean;
  onClose: () => void;
  initialName?: string;
}

export function AddJobDialog(props: AddJobDialogProps) {
  const { queueName, showing, onClose, initialName } = props;
  const [name, setName] = useState(initialName ?? '');
  const [dataText, setDataText] = useState('{}');
  const [delayMs, setDelayMs] = useState('');
  const [dataError, setDataError] = useState('');
  const addJob = useAddJob();

  const submit = () => {
    let data: unknown;
    try {
      data = JSON.parse(dataText || '{}');
    } catch {
      setDataError('Data must be valid JSON.');
      return;
    }
    setDataError('');

    const delay = Number(delayMs);
    addJob.mutate(
      {
        queueName,
        name: name || 'job',
        data,
        options: delayMs && delay > 0 ? { delay } : null,
      },
      {
        onSuccess: () => {
          setName('');
          setDataText('{}');
          setDelayMs('');
          onClose();
        },
      },
    );
  };

  return (
    <Dialog showing={showing} onClose={onClose} title="Add job">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-content-subtle">Name</span>
          <input
            type="text"
            value={name}
            placeholder="job"
            onChange={(event) => setName(event.target.value)}
            className="h-9 rounded-lg border-border-subtle text-sm text-content-emphasis placeholder:text-content-muted focus:border-border-emphasis focus:ring-0"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-content-subtle">Data (JSON)</span>
          <textarea
            value={dataText}
            rows={5}
            onChange={(event) => setDataText(event.target.value)}
            className="rounded-lg border-border-subtle font-mono text-xs text-content-emphasis focus:border-border-emphasis focus:ring-0"
          />
          {dataError && <span className="text-xs text-content-error">{dataError}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-content-subtle">Delay (ms, optional)</span>
          <input
            type="number"
            value={delayMs}
            placeholder="0"
            onChange={(event) => setDelayMs(event.target.value)}
            className="h-9 rounded-lg border-border-subtle text-sm text-content-emphasis placeholder:text-content-muted focus:border-border-emphasis focus:ring-0"
          />
        </label>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="h-9" text="Cancel" onClick={onClose} />
          <Button className="h-9" text="Add job" loading={addJob.isPending} onClick={submit} />
        </div>
      </div>
    </Dialog>
  );
}
