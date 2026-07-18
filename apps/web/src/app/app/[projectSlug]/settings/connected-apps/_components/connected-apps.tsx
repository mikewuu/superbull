'use client';

import { useMutation, useQuery } from 'convex/react';
import { Blocks } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../../convex/_generated/dataModel';
import { ConnectedAppRow } from './connected-app-row';

export function ConnectedApps() {
  const apps = useQuery(api.oauthProvider.listConnectedApps, {});
  const disconnectApp = useMutation(api.oauthProvider.disconnectApp);
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(clientId: string, projectId: Id<'projects'>) {
    setError(null);
    setRevokingGrantId(`${clientId}:${projectId}`);
    try {
      await disconnectApp({ clientId, projectId });
    } catch {
      setError('Could not revoke this connection. Try again.');
    } finally {
      setRevokingGrantId(null);
    }
  }

  if (!apps) {
    return <div className="candy-card h-24 animate-pulse rounded-lg bg-bg-subtle" />;
  }

  if (apps.length === 0) {
    return (
      <div className="candy-card flex items-center gap-3 rounded-lg p-5">
        <Blocks className="size-4 shrink-0 text-content-muted" aria-hidden />
        <p className="text-sm text-content-subtle">
          No connected apps. Approve an OAuth connection to see it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="candy-card divide-y divide-border-subtle overflow-hidden rounded-lg">
        {apps.map((app) => (
          <ConnectedAppRow
            key={`${app.clientId}:${app.projectId}`}
            app={app}
            revoking={revokingGrantId === `${app.clientId}:${app.projectId}`}
            onRevoke={handleRevoke}
          />
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-content-error">{error}</p>}
    </div>
  );
}
