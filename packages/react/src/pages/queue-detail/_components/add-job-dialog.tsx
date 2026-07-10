import { Button, Dialog, cn } from '@bullwatch/ui';
import { useState } from 'react';
import { useAddJob } from '../../../hooks/use-add-job';
import { validateBulkJobs } from '../../../lib/validate-bulk-jobs';

interface AddJobDialogProps {
  queueName: string;
  showing: boolean;
  onClose: () => void;
  initialName?: string;
}

type Mode = 'single' | 'bulk';

export function AddJobDialog(props: AddJobDialogProps) {
  const { queueName, showing, onClose, initialName } = props;
  const [mode, setMode] = useState<Mode>('single');
  const [name, setName] = useState(initialName ?? '');
  const [dataText, setDataText] = useState('{}');
  const [delayMs, setDelayMs] = useState('');
  const [dataError, setDataError] = useState('');
  const [bulkText, setBulkText] = useState('[]');
  const [bulkError, setBulkError] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number } | null>(null);
  const [bulkFailedIndex, setBulkFailedIndex] = useState<number | null>(null);
  const addJob = useAddJob();

  const resetAndClose = () => {
    setMode('single');
    setName('');
    setDataText('{}');
    setDelayMs('');
    setDataError('');
    setBulkText('[]');
    setBulkError('');
    setBulkProgress(null);
    setBulkFailedIndex(null);
    onClose();
  };

  const submitSingle = () => {
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
      { onSuccess: resetAndClose },
    );
  };

  const submitBulk = async () => {
    const result = validateBulkJobs(bulkText);
    if ('error' in result) {
      setBulkError(result.error);
      return;
    }
    setBulkError('');
    setBulkFailedIndex(null);
    setBulkProgress({ total: result.jobs.length, done: 0 });

    for (const [index, job] of result.jobs.entries()) {
      try {
        await addJob.mutateAsync({
          queueName,
          name: job.name,
          data: job.data,
          options: job.opts ?? null,
        });
        setBulkProgress({ total: result.jobs.length, done: index + 1 });
      } catch {
        setBulkFailedIndex(index);
        return;
      }
    }
    resetAndClose();
  };

  return (
    <Dialog showing={showing} onClose={resetAndClose} title="Add job">
      <div className="flex flex-col gap-4">
        <div className="flex gap-0.5 rounded-lg border border-border-subtle p-0.5">
          <button
            type="button"
            data-testid="add-job-mode-single"
            onClick={() => setMode('single')}
            className={cn('h-7 flex-1 rounded-md text-2sm', {
              'bg-bg-inverted font-medium text-white': mode === 'single',
              'text-content-subtle hover:text-content-emphasis': mode !== 'single',
            })}
          >
            Single
          </button>
          <button
            type="button"
            data-testid="add-job-mode-bulk"
            onClick={() => setMode('bulk')}
            className={cn('h-7 flex-1 rounded-md text-2sm', {
              'bg-bg-inverted font-medium text-white': mode === 'bulk',
              'text-content-subtle hover:text-content-emphasis': mode !== 'bulk',
            })}
          >
            Bulk
          </button>
        </div>

        {mode === 'single' ? (
          <>
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
              <Button variant="secondary" className="h-9" text="Cancel" onClick={resetAndClose} />
              <Button
                className="h-9"
                text="Add job"
                loading={addJob.isPending}
                onClick={submitSingle}
              />
            </div>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-content-subtle">
                Jobs — JSON array of {'{ name, data, opts? }'}
              </span>
              <textarea
                value={bulkText}
                rows={8}
                onChange={(event) => setBulkText(event.target.value)}
                className="rounded-lg border-border-subtle font-mono text-xs text-content-emphasis focus:border-border-emphasis focus:ring-0"
              />
              {bulkError && <span className="text-xs text-content-error">{bulkError}</span>}
              {bulkFailedIndex !== null && (
                <span className="text-xs text-content-error">
                  Failed adding job at index {bulkFailedIndex}. {bulkProgress?.done ?? 0} job
                  {bulkProgress?.done === 1 ? '' : 's'} were added before the failure.
                </span>
              )}
              {bulkProgress &&
                bulkFailedIndex === null &&
                bulkProgress.done < bulkProgress.total && (
                  <span className="text-xs text-content-muted">
                    Adding {bulkProgress.done} / {bulkProgress.total}…
                  </span>
                )}
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="h-9" text="Cancel" onClick={resetAndClose} />
              <Button
                className="h-9"
                text="Add jobs"
                loading={addJob.isPending}
                onClick={submitBulk}
              />
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
