'use server';

import { revalidatePath } from 'next/cache';
import { createAlertRule } from '../../../lib/alerts/create-alert-rule';
import { deleteAlertRule } from '../../../lib/alerts/delete-alert-rule';
import type { AlertRuleType } from '../../../lib/alerts/types';
import { updateAlertRule } from '../../../lib/alerts/update-alert-rule';

export interface CreateAlertRuleActionState {
  error: string | null;
}

export async function createAlertRuleAction(
  _prevState: CreateAlertRuleActionState,
  formData: FormData,
): Promise<CreateAlertRuleActionState> {
  const type = String(formData.get('type') ?? '') as AlertRuleType;
  const email = String(formData.get('email') ?? '').trim();
  const sourceId = String(formData.get('sourceId') ?? '').trim();
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

  try {
    await createAlertRule({
      sourceId: sourceId || undefined,
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

  revalidatePath('/app/alerts');
  return { error: null };
}

export async function setAlertRuleEnabledAction(ruleId: string, isEnabled: boolean): Promise<void> {
  await updateAlertRule({ id: ruleId, isEnabled });
  revalidatePath('/app/alerts');
}

export async function deleteAlertRuleAction(ruleId: string): Promise<void> {
  await deleteAlertRule(ruleId);
  revalidatePath('/app/alerts');
}
