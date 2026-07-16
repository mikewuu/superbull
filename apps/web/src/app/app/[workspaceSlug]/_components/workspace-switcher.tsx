'use client';

import { cn } from '@superbull/ui';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../../../../convex/_generated/api';

type Memberships = FunctionReturnType<typeof api.workspaces.listWorkspacesByUser>;

interface WorkspaceSwitcherProps {
  currentSlug: string;
  initialMemberships: Memberships | null;
}

export function WorkspaceSwitcher(props: WorkspaceSwitcherProps) {
  const { currentSlug, initialMemberships } = props;
  const router = useRouter();
  const memberships = useQuery(api.workspaces.listWorkspacesByUser) ?? initialMemberships ?? [];
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const current = memberships.find((item) => item.workspace.slug === currentSlug);
  const currentName = current?.workspace.name ?? currentSlug;

  function goToWorkspace(slug: string) {
    setOpen(false);
    if (slug !== currentSlug) {
      router.push(`/app/${slug}/connectors`);
    }
  }

  async function handleCreateWorkspace() {
    const name = window.prompt('Workspace name');
    if (!name?.trim()) {
      return;
    }
    setCreating(true);
    try {
      const workspace = await createWorkspace({ name: name.trim() });
      setOpen(false);
      router.push(`/app/${workspace.slug}/connectors`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="workspace-switcher"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors duration-150 ease-snout hover:bg-bg-subtle"
      >
        <span className="min-w-0 flex-1 truncate text-2sm font-semibold text-content-emphasis">
          {currentName}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-content-muted" aria-hidden />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close workspace menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border-subtle bg-bg-default p-1 shadow-lg">
            {memberships.map((item) => (
              <button
                key={item.workspace._id}
                type="button"
                data-testid="workspace-switcher-item"
                onClick={() => goToWorkspace(item.workspace.slug)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-2sm text-content-emphasis transition-colors duration-150 ease-snout hover:bg-bg-subtle"
              >
                <span className="min-w-0 flex-1 truncate">{item.workspace.name}</span>
                {item.workspace.slug === currentSlug && (
                  <Check className="size-4 shrink-0 text-blue-600" aria-hidden />
                )}
              </button>
            ))}
            <button
              type="button"
              data-testid="workspace-switcher-new"
              onClick={handleCreateWorkspace}
              disabled={creating}
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-md border-t border-border-subtle px-2.5 py-2 text-left text-2sm font-medium text-content-subtle transition-colors duration-150 ease-snout hover:bg-bg-subtle hover:text-content-emphasis disabled:opacity-60',
              )}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              New workspace
            </button>
          </div>
        </>
      )}
    </div>
  );
}
