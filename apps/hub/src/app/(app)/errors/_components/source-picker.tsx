'use client';

import { useRouter } from 'next/navigation';
import type { ProxySource } from '../../../../lib/sources/types';

interface SourcePickerProps {
  sources: ProxySource[];
  activeSourceId: string;
}

export function SourcePicker(props: SourcePickerProps) {
  const { sources, activeSourceId } = props;
  const router = useRouter();

  return (
    <select
      value={activeSourceId}
      onChange={(event) => router.push(`/errors?source=${event.target.value}`)}
      className="h-8 rounded-lg border border-border-default bg-white px-2 text-2sm text-content-emphasis outline-none"
    >
      {sources.map((source) => (
        <option key={source.id} value={source.id}>
          {source.name}
        </option>
      ))}
    </select>
  );
}
