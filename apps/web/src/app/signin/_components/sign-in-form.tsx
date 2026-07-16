'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { Button } from '@superbull/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

interface SignInFormProps {
  canSignUp: boolean;
}

export function SignInForm(props: SignInFormProps) {
  const { canSignUp } = props;
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    formData.set('flow', flow);
    try {
      await signIn('password', formData);
      router.push('/app');
    } catch {
      setError(flow === 'signIn' ? 'Wrong email or password.' : 'Could not create the account.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-muted p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo-mark.webp" alt="" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-semibold text-content-emphasis">SuperBull Hub</h1>
            <p className="mt-1 text-sm text-content-subtle">
              {flow === 'signIn' ? 'Sign in to your hub' : 'Create the first account'}
            </p>
          </div>
        </div>
        <div className="candy-card rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-content-subtle">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                data-testid="signin-email"
                required
                className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none transition-colors duration-150 ease-snout focus-visible:border-border-emphasis focus-visible:ring-2 focus-visible:ring-blue-500/40"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-content-subtle">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                data-testid="signin-password"
                required
                minLength={8}
                className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none transition-colors duration-150 ease-snout focus-visible:border-border-emphasis focus-visible:ring-2 focus-visible:ring-blue-500/40"
              />
            </div>
            {error && (
              <p data-testid="signin-error" className="text-xs text-content-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              data-testid="signin-submit"
              text={flow === 'signIn' ? 'Sign in' : 'Sign up'}
              loading={submitting}
              className="w-full"
            />
          </form>
          {flow === 'signIn' && canSignUp && (
            <button
              type="button"
              data-testid="signin-toggle-flow"
              onClick={() => setFlow('signUp')}
              className="mt-4 w-full rounded-md text-center text-xs text-content-subtle outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              Don&apos;t have an account?{' '}
              <span className="font-medium text-content-emphasis underline underline-offset-4">
                Sign up
              </span>
            </button>
          )}
          {flow === 'signUp' && (
            <button
              type="button"
              data-testid="signin-toggle-flow"
              onClick={() => setFlow('signIn')}
              className="mt-4 w-full rounded-md text-center text-xs text-content-subtle outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              Already have an account?{' '}
              <span className="font-medium text-content-emphasis underline underline-offset-4">
                Sign in
              </span>
            </button>
          )}
          {flow === 'signIn' && !canSignUp && (
            <p className="mt-4 text-center text-xs text-content-muted">
              Ask an existing user to invite you.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
