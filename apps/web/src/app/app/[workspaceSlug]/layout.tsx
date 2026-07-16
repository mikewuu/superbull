import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { api } from '../../../../convex/_generated/api';
import { requireWorkspaceForSlug } from '../../../lib/workspaces/require-workspace-for-slug';
import { AuthGate } from './_components/auth-gate';
import { NavLinks } from './_components/nav-links';
import { SidebarFooter } from './_components/sidebar-footer';
import { WorkspaceSwitcher } from './_components/workspace-switcher';

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspaceLayout(props: WorkspaceLayoutProps) {
  const { children } = props;
  const { workspaceSlug } = await props.params;

  // Resolving here (rather than trusting a client-only check) is what
  // notFound()s a slug the caller isn't a member of, before any workspace
  // data ever reaches the client.
  await requireWorkspaceForSlug(workspaceSlug);

  const token = await convexAuthNextjsToken();
  const initialMemberships = await fetchQuery(
    api.workspaces.listWorkspacesByUser,
    {},
    { token },
  ).catch(() => null);

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-bg-default">
        <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-border-subtle bg-bg-default p-3">
          <Link
            href={`/app/${workspaceSlug}/connectors`}
            className="flex h-10 items-center gap-2.5 px-2"
          >
            <img src="/logo-mark.webp" alt="" className="h-7 w-auto" />
            <span className="text-2sm font-semibold tracking-tight text-content-emphasis">
              SuperBull
            </span>
          </Link>
          <WorkspaceSwitcher currentSlug={workspaceSlug} initialMemberships={initialMemberships} />
          <NavLinks workspaceSlug={workspaceSlug} />
          <SidebarFooter />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto bg-bg-default">{children}</main>
      </div>
    </AuthGate>
  );
}
