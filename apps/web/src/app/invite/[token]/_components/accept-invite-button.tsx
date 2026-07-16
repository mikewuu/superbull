'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '@superbull/ui';
import { useConvexAuth, useMutation } from 'convex/react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../../../../convex/_generated/api';

interface AcceptInviteButtonProps {
  tokenHash: string;
}

export function AcceptInviteButton(props: AcceptInviteButtonProps) {
  const { tokenHash } = props;
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const acceptInvite = useMutation(api.invites.accept);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleAccept() {
    setPending(true);
    setError(null);
    try {
      const result = await acceptInvite({ tokenHash });
      router.push(`/app/${result.workspace.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this invite.');
      setPending(false);
    }
  }

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button
        type="button"
        data-testid="invite-sign-in"
        text="Sign in to accept"
        onClick={() => signIn('google', { redirectTo: pathname })}
        className="w-full"
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        data-testid="invite-accept"
        text="Accept invite"
        loading={pending}
        onClick={handleAccept}
        className="w-full"
      />
      {error && <p className="text-xs text-content-error">{error}</p>}
    </div>
  );
}
