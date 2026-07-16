'use client';

import { Button, Dialog } from '@superbull/ui';
import { useState, useTransition } from 'react';
import type { DashboardCardType, DashboardRange } from '../../../../../lib/dashboards/types';
import { addDashboardCardAction } from '../../actions';

interface AddCardDialogProps {
  dashboardId: string;
  sources: Array<{ id: string; name: string }>;
}

const cardTypes: DashboardCardType[] = ['throughput', 'latency', 'totals', 'heatmap'];
const ranges: DashboardRange[] = ['24h', '7d', '30d'];

export function AddCardDialog(props: AddCardDialogProps) {
  const { dashboardId, sources } = props;
  const [showing, setShowing] = useState(false);
  const [type, setType] = useState<DashboardCardType>('throughput');
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [queueName, setQueueName] = useState('');
  const [range, setRange] = useState<DashboardRange>('24h');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!sourceId) {
      setError('Pick a source first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      await addDashboardCardAction({
        dashboardId,
        type,
        sourceId,
        queueName: queueName.trim() || undefined,
        range,
      });
      setShowing(false);
      setQueueName('');
    });
  };

  return (
    <>
      <Button text="Add card" onClick={() => setShowing(true)} className="h-9" />
      <Dialog showing={showing} onClose={() => setShowing(false)} title="Add card">
        <div className="space-y-3">
          <div>
            <label htmlFor="card-type" className="block text-xs font-medium text-content-subtle">
              Chart type
            </label>
            <select
              id="card-type"
              value={type}
              onChange={(event) => setType(event.target.value as DashboardCardType)}
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            >
              {cardTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="card-source" className="block text-xs font-medium text-content-subtle">
              Source
            </label>
            <select
              id="card-source"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="card-queue" className="block text-xs font-medium text-content-subtle">
              Queue name (optional)
            </label>
            <input
              id="card-queue"
              value={queueName}
              onChange={(event) => setQueueName(event.target.value)}
              placeholder="all queues"
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            />
          </div>
          <div>
            <label htmlFor="card-range" className="block text-xs font-medium text-content-subtle">
              Range
            </label>
            <select
              id="card-range"
              value={range}
              onChange={(event) => setRange(event.target.value as DashboardRange)}
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            >
              {ranges.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-content-error">{error}</p>}
          <Button text="Add card" loading={pending} onClick={handleSubmit} className="w-full" />
        </div>
      </Dialog>
    </>
  );
}
