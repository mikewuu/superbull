import { Breadcrumbs, PageHeader, StatusBadge } from '@superbull/ui';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { listAnnotationsByProject } from '../../../../../lib/deploy-annotations/list-annotations-by-project';
import { findErrorGroupById } from '../../../../../lib/errors/find-error-group-by-id';
import type { ErrorGroupState } from '../../../../../lib/errors/types';
import { requireProjectForSlug } from '../../../../../lib/projects/require-project-for-slug';
import { ErrorGroupActions } from './_components/error-group-actions';

export const dynamic = 'force-dynamic';

interface ErrorGroupDetailPageProps {
  params: Promise<{ projectSlug: string; groupId: string }>;
}

export default async function ErrorGroupDetailPage(props: ErrorGroupDetailPageProps) {
  const { projectSlug, groupId } = await props.params;
  const { project } = await requireProjectForSlug(projectSlug);
  const group = await findErrorGroupById(project._id, groupId as Id<'errorGroups'>);
  if (!group) {
    notFound();
  }

  const deployContext = await getDeployContext(
    project._id,
    group.connectorId as Id<'connectors'>,
    group.lastSeenTs,
  );

  return (
    <>
      <PageHeader
        title={
          <Breadcrumbs
            items={[
              {
                label: 'Errors',
                to: `/app/${projectSlug}/errors?connector=${group.connectorId}`,
              },
              { label: group.queueName },
            ]}
          />
        }
        controls={
          <ErrorGroupActions projectSlug={projectSlug} groupId={group.id} state={group.state} />
        }
      />
      <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6">
        <div className="candy-card rounded-lg p-5">
          <div className="flex items-center gap-2">
            <StatusBadge variant={stateBadgeVariant(group.state)}>{group.state}</StatusBadge>
            {group.isRegression && <StatusBadge variant="error">regression</StatusBadge>}
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words font-mono text-sm text-content-emphasis">
            {group.message}
          </p>
        </div>
        <div className="candy-card grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg p-5 text-2sm md:grid-cols-4">
          <MetadataRow label="Queue" value={group.queueName} />
          <MetadataRow label="Job name" value={group.jobName ?? '-'} />
          <MetadataRow label="Last job id" value={group.lastJobId ?? '-'} />
          <MetadataRow label="Count" value={String(group.count)} />
          <MetadataRow label="First seen" value={new Date(group.firstSeenTs).toLocaleString()} />
          <MetadataRow label="Last seen" value={new Date(group.lastSeenTs).toLocaleString()} />
        </div>
        <div className="candy-card rounded-lg p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-content-muted">
            Deploy context
          </p>
          <p className="mt-1 text-2sm text-content-subtle">{deployContext}</p>
        </div>
      </div>
    </>
  );
}

function stateBadgeVariant(
  state: ErrorGroupState,
): 'neutral' | 'new' | 'success' | 'pending' | 'warning' | 'error' {
  if (state === 'resolved') {
    return 'success';
  }
  if (state === 'ignored') {
    return 'neutral';
  }
  return 'pending';
}

interface MetadataRowProps {
  label: string;
  value: ReactNode;
}

function MetadataRow(props: MetadataRowProps) {
  const { label, value } = props;
  return (
    <div>
      <p className="text-xs text-content-muted">{label}</p>
      <p className="mt-0.5 truncate font-mono text-xs text-content-emphasis">{value}</p>
    </div>
  );
}

async function getDeployContext(
  projectId: Id<'projects'>,
  connectorId: Id<'connectors'>,
  lastSeenTs: number,
): Promise<string> {
  const annotations = await listAnnotationsByProject(projectId, connectorId);
  const lastDeploy = annotations
    .filter((annotation) => annotation.ts <= lastSeenTs)
    .sort((a, b) => b.ts - a.ts)[0];
  if (!lastDeploy) {
    return '-';
  }
  const minutesEarlier = Math.round((lastSeenTs - lastDeploy.ts) / 60_000);
  return `last deploy before last occurrence: ${lastDeploy.label}, ${minutesEarlier}m earlier`;
}
