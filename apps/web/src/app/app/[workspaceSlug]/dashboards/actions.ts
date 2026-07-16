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
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';

export async function createDashboardAction(
  workspaceSlug: string,
  name: string,
): Promise<SavedDashboard> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const dashboard = await createDashboard({ workspaceId: workspace._id, name, cards: [] });
  revalidatePath(`/app/${workspaceSlug}/dashboards`);
  return dashboard;
}

export async function deleteDashboardAction(
  workspaceSlug: string,
  dashboardId: string,
): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  await deleteDashboard(workspace._id, dashboardId as Id<'savedDashboards'>);
  revalidatePath(`/app/${workspaceSlug}/dashboards`);
}

export async function addDashboardCardAction(
  workspaceSlug: string,
  args: {
    dashboardId: string;
    type: DashboardCardType;
    connectorId: string;
    queueName?: string;
    range: DashboardRange;
  },
): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const dashboardId = args.dashboardId as Id<'savedDashboards'>;
  const dashboard = await findDashboardById(workspace._id, dashboardId);
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
    workspaceId: workspace._id,
    id: dashboardId,
    cards: [...dashboard.cards, newCard],
  });
  revalidatePath(`/app/${workspaceSlug}/dashboards/${args.dashboardId}`);
}

export async function removeDashboardCardAction(
  workspaceSlug: string,
  dashboardId: string,
  cardIndex: number,
): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const id = dashboardId as Id<'savedDashboards'>;
  const dashboard = await findDashboardById(workspace._id, id);
  if (!dashboard) {
    throw new Error('unknown dashboard');
  }
  const newCards = dashboard.cards.filter((_, index) => index !== cardIndex);
  await updateDashboard({ workspaceId: workspace._id, id, cards: newCards });
  revalidatePath(`/app/${workspaceSlug}/dashboards/${dashboardId}`);
}
