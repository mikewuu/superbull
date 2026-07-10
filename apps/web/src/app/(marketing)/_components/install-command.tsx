'use client';

import { useState } from 'react';
import { cn } from '../../../lib/cn';
import { CopyButton } from './copy-button';

type ModeId = 'embed' | 'proxy';

const modes: Record<ModeId, { label: string; command: string }> = {
  embed: { label: 'Embed', command: 'npm install @superbull/api @superbull/express' },
  proxy: { label: 'Proxy', command: 'npx superbull-proxy -n "my-app" -t $SUPERBULL_TOKEN' },
};

export function InstallCommand(): React.ReactElement {
  const [mode, setMode] = useState<ModeId>('embed');
  const active = modes[mode];

  return (
    <div className="overflow-hidden rounded-2xl bg-bg-inverted shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
      <div className="flex items-center gap-1 border-b border-white/10 px-2 pt-2">
        {(Object.keys(modes) as ModeId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn('rounded-t-lg px-3.5 py-2 text-2sm font-medium transition-colors', {
              'bg-white/10 text-white': mode === id,
              'text-white/45 hover:text-white/75': mode !== id,
            })}
          >
            {modes[id].label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <code
          title={active.command}
          className="min-w-0 flex-1 truncate font-mono text-xs leading-none text-white sm:text-sm"
        >
          {active.command}
        </code>
        <CopyButton text={active.command} />
      </div>
    </div>
  );
}
