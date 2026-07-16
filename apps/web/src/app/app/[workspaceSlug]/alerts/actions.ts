'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { createAlertRule } from '../../../../lib/alerts/create-alert-rule';
import { deleteAlertRule } from '../../../../lib/alerts/delete-alert-rule';
import type { AlertRuleType } from '../../../../lib/alerts/types';
import { updateAlertRule } from '../../../../lib/alerts/update-alert-rule';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';

export interface CreateAlertRuleActionState {
  error: string | null;
}

export async function createAlertRuleAction(
  workspaceSlug: string,
  _prevState: CreateAlertRuleActionState,
  formData: FormData,
): Promise<CreateAlertRuleActionState> {
  const type = String(formData.get('type') ?? '') as AlertRuleType;
  const email = String(formData.get('email') ?? '').trim();
  const connectorId = String(formData.get('connectorId') ?? '').trim();
  const queueName = String(formData.get('queueName') ?? '').trim();
  const thresholdRaw = String(formData.get('threshold') ?? '').trim();
  const windowMinutesRaw = String(formData.get('windowMinutes') ?? '').trim();

  if (!email) {
    return { error: 'Email is required.' };
  }
  const windowMinutes = Number(windowMinutesRaw);
  if (!windowMinutesRaw || Number.isNaN(windowMinutes) || windowMinutes <= 0) {
    return { error: 'Window (minutes) must be a positive number.' };
  }
  if (type === 'failed_threshold' && (!thresholdRaw || Number(thresholdRaw) <= 0)) {
    return { error: 'Threshold must be a positive number.' };
  }
  if ((type === 'stuck_queue' || type === 'worker_loss') && !queueName) {
    return { error: 'Queue name is required for this alert type.' };
  }

  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);

  try {
    await createAlertRule({
      workspaceId: workspace._id,
      connectorId: connectorId ? (connectorId as Id<'connectors'>) : undefined,
      type,
      queueName: queueName || undefined,
      threshold: thresholdRaw ? Number(thresholdRaw) : undefined,
      windowMinutes,
      email,
      isEnabled: true,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create alert rule.' };
  }

  revalidatePath(`/app/${workspaceSlug}/alerts`);
  return { error: null };
}

export async function setAlertRuleEnabledAction(
  workspaceSlug: string,
  ruleId: string,
  isEnabled: boolean,
): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  await updateAlertRule({ workspaceId: workspace._id, id: ruleId as Id<'alertRules'>, isEnabled });
  revalidatePath(`/app/${workspaceSlug}/alerts`);
}

export async function deleteAlertRuleAction(workspaceSlug: string, ruleId: string): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  await deleteAlertRule(workspace._id, ruleId as Id<'alertRules'>);
  revalidatePath(`/app/${workspaceSlug}/alerts`);
}
