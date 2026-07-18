'use client';

import { useRouter } from 'next/navigation';
import type { Connector } from '../../../../../lib/connectors/types';

interface ConnectorPickerProps {
  projectSlug: string;
  connectors: Connector[];
  activeConnectorId: string;
}

export function ConnectorPicker(props: ConnectorPickerProps) {
  const { projectSlug, connectors, activeConnectorId } = props;
  const router = useRouter();

  return (
    <select
      value={activeConnectorId}
      onChange={(event) =>
        router.push(`/app/${projectSlug}/errors?connector=${event.target.value}`)
      }
      className="h-8 rounded-lg border border-border-default bg-white px-2 text-2sm text-content-emphasis outline-none"
    >
      {connectors.map((connector) => (
        <option key={connector.id} value={connector.id}>
          {connector.name}
        </option>
      ))}
    </select>
  );
}
