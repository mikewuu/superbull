'use server';

import { revalidatePath } from 'next/cache';
import { createDashboard } from '../../../lib/dashboards/create-dashboard';
import { deleteDashboard } from '../../../lib/dashboards/delete-dashboard';
import { findDashboardById } from '../../../lib/dashboards/find-dashboard-by-id';
import type {
  DashboardCardType,
  DashboardRange,
  SavedDashboard,
} from '../../../lib/dashboards/types';
import { updateDashboard } from '../../../lib/dashboards/update-dashboard';

export async function createDashboardAction(name: string): Promise<SavedDashboard> {
  const dashboard = await createDashboard({ name, cards: [] });
  revalidatePath('/dashboards');
  return dashboard;
}

export async function deleteDashboardAction(dashboardId: string): Promise<void> {
  await deleteDashboard(dashboardId);
  revalidatePath('/dashboards');
}

export async function addDashboardCardAction(args: {
  dashboardId: string;
  type: DashboardCardType;
  sourceId: string;
  queueName?: string;
  range: DashboardRange;
}): Promise<void> {
  const dashboard = await findDashboardById(args.dashboardId);
  if (!dashboard) {
    throw new Error('unknown dashboard');
  }
  const newCard = {
    type: args.type,
    source_id: args.sourceId,
    queue_name: args.queueName,
    range: args.range,
  };
  await updateDashboard({ id: args.dashboardId, cards: [...dashboard.cards, newCard] });
  revalidatePath(`/dashboards/${args.dashboardId}`);
}

export async function removeDashboardCardAction(
  dashboardId: string,
  cardIndex: number,
): Promise<void> {
  const dashboard = await findDashboardById(dashboardId);
  if (!dashboard) {
    throw new Error('unknown dashboard');
  }
  const newCards = dashboard.cards.filter((_, index) => index !== cardIndex);
  await updateDashboard({ id: dashboardId, cards: newCards });
  revalidatePath(`/dashboards/${dashboardId}`);
}
