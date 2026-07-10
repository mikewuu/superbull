'use server';

import { revalidatePath } from 'next/cache';
import { setErrorGroupState } from '../../../lib/errors/set-error-group-state';

export async function resolveErrorGroupAction(groupId: string): Promise<void> {
  await setErrorGroupState({ groupId, state: 'resolved' });
  revalidatePath('/errors');
  revalidatePath(`/errors/${groupId}`);
}

export async function ignoreErrorGroupAction(groupId: string): Promise<void> {
  await setErrorGroupState({ groupId, state: 'ignored' });
  revalidatePath('/errors');
  revalidatePath(`/errors/${groupId}`);
}

export async function reopenErrorGroupAction(groupId: string): Promise<void> {
  await setErrorGroupState({ groupId, state: 'open' });
  revalidatePath('/errors');
  revalidatePath(`/errors/${groupId}`);
}
