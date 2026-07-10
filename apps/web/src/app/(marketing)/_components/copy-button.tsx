'use client';

import { useState } from 'react';
import { cn } from '../../../lib/cn';

type CopyButtonProps = {
  text: string;
  className?: string;
};

export function CopyButton(props: CopyButtonProps): React.ReactElement {
  const { text, className } = props;
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-2sm font-medium text-white/60 transition-colors hover:text-white',
        className,
      )}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  );
}
