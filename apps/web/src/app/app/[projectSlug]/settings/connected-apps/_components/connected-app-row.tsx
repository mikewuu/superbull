import type { Id } from '../../../../../../../convex/_generated/dataModel';

interface ConnectedAppRowProps {
  app: {
    clientId: string;
    clientName: string;
    projectId: Id<'projects'>;
    projectName: string;
    connectedAt: number;
  };
  revoking: boolean;
  onRevoke: (clientId: string, projectId: Id<'projects'>) => void;
}

export function ConnectedAppRow(props: ConnectedAppRowProps) {
  const { app, revoking, onRevoke } = props;

  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-content-emphasis">{app.clientName}</span>
          <span className="rounded-md bg-bg-subtle px-2 py-0.5 text-xs text-content-subtle">
            {app.projectName}
          </span>
        </div>
        <p className="mt-1 text-xs text-content-muted">
          Connected {new Date(app.connectedAt).toLocaleDateString()}
        </p>
      </div>
      <button
        type="button"
        disabled={revoking}
        onClick={() => onRevoke(app.clientId, app.projectId)}
        className="self-start text-xs font-medium text-content-error hover:underline disabled:opacity-60 sm:self-auto"
      >
        {revoking ? 'Revoking…' : 'Revoke'}
      </button>
    </li>
  );
}
