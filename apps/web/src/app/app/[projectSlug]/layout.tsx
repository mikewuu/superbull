import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { api } from '../../../../convex/_generated/api';
import { requireProjectForSlug } from '../../../lib/projects/require-project-for-slug';
import { AuthGate } from './_components/auth-gate';
import { NavLinks } from './_components/nav-links';
import { ProjectSwitcher } from './_components/project-switcher';
import { SidebarFooter } from './_components/sidebar-footer';

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectSlug: string }>;
}

export default async function ProjectLayout(props: ProjectLayoutProps) {
  const { children } = props;
  const { projectSlug } = await props.params;

  // Resolving here (rather than trusting a client-only check) is what
  // notFound()s a slug the caller isn't a member of, before any project
  // data ever reaches the client.
  await requireProjectForSlug(projectSlug);

  const token = await convexAuthNextjsToken();
  const initialMemberships = await fetchQuery(api.projects.listProjectsByUser, {}, { token }).catch(
    () => null,
  );

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-bg-default">
        <aside className="flex w-60 shrink-0 flex-col gap-3 border-r border-border-subtle bg-bg-default p-3">
          <Link
            href={`/app/${projectSlug}/connectors`}
            className="flex h-10 items-center gap-2.5 px-2"
          >
            <img src="/logo-mark.webp" alt="" className="h-7 w-auto" />
            <span className="text-2sm font-semibold tracking-tight text-content-emphasis">
              SuperBull
            </span>
          </Link>
          <ProjectSwitcher currentSlug={projectSlug} initialMemberships={initialMemberships} />
          <NavLinks projectSlug={projectSlug} />
          <SidebarFooter />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto bg-bg-default">{children}</main>
      </div>
    </AuthGate>
  );
}
