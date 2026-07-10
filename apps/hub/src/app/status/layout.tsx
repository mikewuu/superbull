import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface StatusLayoutProps {
  children: ReactNode;
}

export default function StatusLayout(props: StatusLayoutProps) {
  const { children } = props;

  return <div className="min-h-screen bg-bg-default">{children}</div>;
}
