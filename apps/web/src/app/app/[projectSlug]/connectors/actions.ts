'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import {
  type CreateConnectorResult,
  createConnector,
} from '../../../../lib/connectors/create-connector';
import { removeConnector } from '../../../../lib/connectors/remove-connector';
import { requireProjectForSlug } from '../../../../lib/projects/require-project-for-slug';

export interface CreateConnectorActionState {
  error: string | null;
  result?: CreateConnectorResult;
}

export async function createConnectorAction(
  projectSlug: string,
  _prevState: CreateConnectorActionState,
  formData: FormData,
): Promise<CreateConnectorActionState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const { project } = await requireProjectForSlug(projectSlug);
  const result = await createConnector(project._id, name);
  revalidatePath(`/app/${projectSlug}/connectors`);
  return { error: null, result };
}

export async function removeConnectorAction(
  projectSlug: string,
  connectorId: string,
): Promise<void> {
  const { project } = await requireProjectForSlug(projectSlug);
  await removeConnector(project._id, connectorId as Id<'connectors'>);
  revalidatePath(`/app/${projectSlug}/connectors`);
}
