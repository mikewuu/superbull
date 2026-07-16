import { EmptyState } from '@superbull/ui';
import { Unplug } from 'lucide-react';

// Rendered when the hosted gateway reports 502 "connector disconnected".
// The data hooks keep polling, so this state clears by itself the moment
// the connector process reconnects.
export function ConnectorDisconnectedNotice() {
  return (
    <div className="candy-card rounded-lg">
      <EmptyState
        icon={Unplug}
        title="Connector disconnected"
        description="Restart npx @superbull/connector next to your Redis. This page recovers automatically as soon as it reconnects."
      />
    </div>
  );
}
