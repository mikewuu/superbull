import { Activity } from 'lucide-react';

export default function StatusPageNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-bg-inverted">
        <Activity className="size-5 text-content-inverted" />
      </span>
      <div>
        <h1 className="text-lg font-semibold text-content-emphasis">
          No status page at this address.
        </h1>
        <p className="mt-1 text-sm text-content-subtle">Check the link and try again.</p>
      </div>
    </div>
  );
}
