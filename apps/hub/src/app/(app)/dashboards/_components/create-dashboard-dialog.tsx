'use client';

import { Button, Dialog } from '@bullwatch/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createDashboardAction } from '../actions';

export function CreateDashboardDialog() {
  const [showing, setShowing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const dashboard = await createDashboardAction(trimmed);
      setShowing(false);
      setName('');
      router.push(`/dashboards/${dashboard.id}`);
    });
  };

  return (
    <>
      <Button text="New dashboard" onClick={() => setShowing(true)} className="h-9" />
      <Dialog showing={showing} onClose={() => setShowing(false)} title="New dashboard">
        <div className="space-y-3">
          <div>
            <label
              htmlFor="dashboard-name"
              className="block text-xs font-medium text-content-subtle"
            >
              Name
            </label>
            <input
              id="dashboard-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
            />
          </div>
          {error && <p className="text-xs text-content-error">{error}</p>}
          <Button text="Create" loading={pending} onClick={handleSubmit} className="w-full" />
        </div>
      </Dialog>
    </>
  );
}
