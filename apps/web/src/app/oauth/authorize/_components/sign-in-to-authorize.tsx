'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '@superbull/ui';
import { useState } from 'react';

interface SignInToAuthorizeProps {
  returnUrl: string;
}

export function SignInToAuthorize(props: SignInToAuthorizeProps) {
  const { returnUrl } = props;
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn('google', { redirectTo: returnUrl });
    } catch {
      setError("Couldn't reach Google. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        text="Continue with Google"
        loading={submitting}
        onClick={handleSignIn}
        className="w-full"
      />
      {error && <p className="text-xs text-content-error">{error}</p>}
    </div>
  );
}
