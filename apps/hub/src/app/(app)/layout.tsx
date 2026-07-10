import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout(props: AppLayoutProps) {
  const { children } = props;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 px-6 py-4">
        <h1 className="text-sm font-medium">Bullwatch Hub</h1>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
