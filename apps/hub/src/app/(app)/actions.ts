'use server';

import { revalidatePath } from 'next/cache';
import { createSource } from '../../lib/sources/create-source';
import { deleteSource } from '../../lib/sources/delete-source';

export interface CreateSourceActionState {
  error: string | null;
}

export async function createSourceAction(
  _prevState: CreateSourceActionState,
  formData: FormData,
): Promise<CreateSourceActionState> {
  const name = String(formData.get('name') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const token = String(formData.get('token') ?? '').trim();

  if (!name || !url || !token) {
    return { error: 'Name, URL, and token are all required.' };
  }

  await createSource({ name, url, token });
  revalidatePath('/');
  return { error: null };
}

export async function deleteSourceAction(sourceId: string): Promise<void> {
  await deleteSource(sourceId);
  revalidatePath('/');
}
