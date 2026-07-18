'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '@superbull/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Gated purely on the NEXT_PUBLIC_ build-time flag (see
// playwright.config.ts's `web` webServer env block) — Next.js inlines
// NEXT_PUBLIC_* vars at build time regardless of the env.ts zod wrapper, so
// no server round-trip is needed to decide whether to render this button.
// Never set in production.
const testLoginEnabled = process.env.NEXT_PUBLIC_AUTH_TEST_LOGIN === 'true';

export function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'google' | 'test-login' | null>(null);

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting('google');
    try {
      await signIn('google', { redirectTo: '/app' });
    } catch {
      setError("Couldn't reach Google. Try again.");
      setSubmitting(null);
    }
  }

  async function handleTestLogin() {
    setError(null);
    setSubmitting('test-login');
    try {
      await signIn('test-login', {});
      router.push('/app');
    } catch {
      setError('Test sign-in failed.');
      setSubmitting(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-muted p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo-mark.webp" alt="" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-semibold text-content-emphasis">SuperBull</h1>
            <p className="mt-1 text-sm text-content-subtle">Sign in to your project</p>
          </div>
        </div>
        <div className="candy-card space-y-3 rounded-lg p-6">
          <Button
            type="button"
            data-testid="signin-google"
            text="Continue with Google"
            loading={submitting === 'google'}
            disabled={submitting !== null}
            onClick={handleGoogleSignIn}
            className="w-full"
          />
          {error && (
            <p data-testid="signin-error" className="text-xs text-content-error">
              {error}
            </p>
          )}
          {testLoginEnabled && (
            <Button
              type="button"
              variant="secondary"
              data-testid="signin-test-login"
              text="Continue with test account"
              loading={submitting === 'test-login'}
              disabled={submitting !== null}
              onClick={handleTestLogin}
              className="w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
