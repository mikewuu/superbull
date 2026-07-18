'use client';

import { cn } from '@superbull/ui';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../../../../convex/_generated/api';

type Memberships = FunctionReturnType<typeof api.projects.listProjectsByUser>;

interface ProjectSwitcherProps {
  currentSlug: string;
  initialMemberships: Memberships | null;
}

export function ProjectSwitcher(props: ProjectSwitcherProps) {
  const { currentSlug, initialMemberships } = props;
  const router = useRouter();
  const memberships = useQuery(api.projects.listProjectsByUser) ?? initialMemberships ?? [];
  const createProject = useMutation(api.projects.createProject);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const current = memberships.find((item) => item.project.slug === currentSlug);
  const currentName = current?.project.name ?? currentSlug;

  function goToProject(slug: string) {
    setOpen(false);
    if (slug !== currentSlug) {
      router.push(`/app/${slug}/connectors`);
    }
  }

  async function handleCreateProject() {
    const name = window.prompt('Project name');
    if (!name?.trim()) {
      return;
    }
    setCreating(true);
    try {
      const project = await createProject({ name: name.trim() });
      setOpen(false);
      router.push(`/app/${project.slug}/connectors`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="project-switcher"
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
            aria-label="Close project menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border-subtle bg-bg-default p-1 shadow-lg">
            {memberships.map((item) => (
              <button
                key={item.project._id}
                type="button"
                data-testid="project-switcher-item"
                onClick={() => goToProject(item.project.slug)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-2sm text-content-emphasis transition-colors duration-150 ease-snout hover:bg-bg-subtle"
              >
                <span className="min-w-0 flex-1 truncate">{item.project.name}</span>
                {item.project.slug === currentSlug && (
                  <Check className="size-4 shrink-0 text-blue-600" aria-hidden />
                )}
              </button>
            ))}
            <button
              type="button"
              data-testid="project-switcher-new"
              onClick={handleCreateProject}
              disabled={creating}
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-md border-t border-border-subtle px-2.5 py-2 text-left text-2sm font-medium text-content-subtle transition-colors duration-150 ease-snout hover:bg-bg-subtle hover:text-content-emphasis disabled:opacity-60',
              )}
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              New project
            </button>
          </div>
        </>
      )}
    </div>
  );
}
