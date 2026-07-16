'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../convex/_generated/api';

export function SidebarFooter() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);

  async function handleSignOut() {
    await signOut();
    router.push('/signin');
  }

  return (
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-subtle px-2.5 py-2">
      <span data-testid="sidebar-user-email" className="truncate text-2sm text-content-subtle">
        {viewer?.email ?? ''}
      </span>
      <button
        type="button"
        data-testid="sidebar-sign-out"
        aria-label="Sign out"
        onClick={handleSignOut}
        className="shrink-0 rounded-md p-1.5 text-content-muted transition-colors duration-150 ease-snout hover:bg-bg-subtle hover:text-content-emphasis"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
