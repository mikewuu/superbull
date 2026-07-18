'use client';

import { EmptyState } from '@superbull/ui';
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
      <EmptyState
        icon={<Blocks className="size-5 text-content-muted" />}
        title="No connected apps"
        description="Approve an OAuth connection to see it here."
      />
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
