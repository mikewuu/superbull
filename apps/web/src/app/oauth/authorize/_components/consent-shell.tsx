import type { ReactNode } from 'react';

interface ConsentShellProps {
  children: ReactNode;
}

export function ConsentShell(props: ConsentShellProps) {
  const { children } = props;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-muted p-6">
      <div className="candy-card w-full max-w-md rounded-lg p-6">{children}</div>
    </div>
  );
}
