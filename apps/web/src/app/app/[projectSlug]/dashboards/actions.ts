'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { createDashboard } from '../../../../lib/dashboards/create-dashboard';
import { deleteDashboard } from '../../../../lib/dashboards/delete-dashboard';
import { findDashboardById } from '../../../../lib/dashboards/find-dashboard-by-id';
import type {
  DashboardCardType,
  DashboardRange,
  SavedDashboard,
} from '../../../../lib/dashboards/types';
import { updateDashboard } from '../../../../lib/dashboards/update-dashboard';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';

export async function createDashboardAction(
  projectSlug: string,
  name: string,
): Promise<SavedDashboard> {
  const { project } = await requireProjectForSlug(projectSlug);
  const dashboard = await createDashboard({ projectId: project._id, name, cards: [] });
  revalidatePath(`/app/${projectSlug}/dashboards`);
  return dashboard;
}

export async function deleteDashboardAction(
  projectSlug: string,
  dashboardId: string,
): Promise<void> {
  const { project } = await requireProjectForSlug(projectSlug);
  await deleteDashboard(project._id, dashboardId as Id<'savedDashboards'>);
  revalidatePath(`/app/${projectSlug}/dashboards`);
}

export async function addDashboardCardAction(
  projectSlug: string,
  args: {
    dashboardId: string;
    type: DashboardCardType;
    connectorId: string;
    queueName?: string;
    range: DashboardRange;
  },
): Promise<void> {
  const { project } = await requireProjectForSlug(projectSlug);
  const dashboardId = args.dashboardId as Id<'savedDashboards'>;
  const dashboard = await findDashboardById(project._id, dashboardId);
  if (!dashboard) {
    throw new Error('unknown dashboard');
  }
  const newCard = {
    type: args.type,
    connector_id: args.connectorId,
    queue_name: args.queueName,
    range: args.range,
  };
  await updateDashboard({
    projectId: project._id,
    id: dashboardId,
    cards: [...dashboard.cards, newCard],
  });
  revalidatePath(`/app/${projectSlug}/dashboards/${args.dashboardId}`);
}

export async function removeDashboardCardAction(
  projectSlug: string,
  dashboardId: string,
  cardIndex: number,
): Promise<void> {
  const { project } = await requireProjectForSlug(projectSlug);
  const id = dashboardId as Id<'savedDashboards'>;
  const dashboard = await findDashboardById(project._id, id);
  if (!dashboard) {
    throw new Error('unknown dashboard');
  }
  const newCards = dashboard.cards.filter((_, index) => index !== cardIndex);
  await updateDashboard({ projectId: project._id, id, cards: newCards });
  revalidatePath(`/app/${projectSlug}/dashboards/${dashboardId}`);
}
