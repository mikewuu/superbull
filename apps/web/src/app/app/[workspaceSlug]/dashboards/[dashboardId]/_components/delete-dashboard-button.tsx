'use client';

import { ConfirmDialog } from '@superbull/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteDashboardAction } from '../../actions';

interface DeleteDashboardButtonProps {
  workspaceSlug: string;
  dashboardId: string;
  dashboardName: string;
}

export function DeleteDashboardButton(props: DeleteDashboardButtonProps) {
  const { workspaceSlug, dashboardId, dashboardName } = props;
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleConfirm = () => {
    startTransition(async () => {
      await deleteDashboardAction(workspaceSlug, dashboardId);
      setConfirming(false);
      router.push(`/app/${workspaceSlug}/dashboards`);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-9 items-center rounded-lg border border-border-default px-3 text-xs font-medium text-content-muted hover:text-content-error"
      >
        Delete dashboard
      </button>
      <ConfirmDialog
        showing={confirming}
        onClose={() => setConfirming(false)}
        title="Delete dashboard"
        description={`This permanently deletes "${dashboardName}" and its cards.`}
        confirmText="Delete"
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
