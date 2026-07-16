'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '../../../../../convex/_generated/dataModel';
import {
  type CreateConnectorResult,
  createConnector,
} from '../../../../lib/connectors/create-connector';
import { removeConnector } from '../../../../lib/connectors/remove-connector';
import { requireWorkspaceForSlug } from '../../../../lib/workspaces/require-workspace-for-slug';

export interface CreateConnectorActionState {
  error: string | null;
  result?: CreateConnectorResult;
}

export async function createConnectorAction(
  workspaceSlug: string,
  _prevState: CreateConnectorActionState,
  formData: FormData,
): Promise<CreateConnectorActionState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  const result = await createConnector(workspace._id, name);
  revalidatePath(`/app/${workspaceSlug}/connectors`);
  return { error: null, result };
}

export async function removeConnectorAction(
  workspaceSlug: string,
  connectorId: string,
): Promise<void> {
  const { workspace } = await requireWorkspaceForSlug(workspaceSlug);
  await removeConnector(workspace._id, connectorId as Id<'connectors'>);
  revalidatePath(`/app/${workspaceSlug}/connectors`);
}
