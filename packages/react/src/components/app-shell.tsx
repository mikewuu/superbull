import { Outlet } from 'react-router';
import { Sidebar } from './sidebar';

export function AppShell() {
  return (
    <div className="flex h-screen bg-bg-default">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
