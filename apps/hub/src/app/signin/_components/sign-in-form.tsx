'use client';

import { Button } from '@bullwatch/ui';
import { useAuthActions } from '@convex-dev/auth/react';
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
      router.push('/');
    } catch {
      setError(flow === 'signIn' ? 'Wrong email or password.' : 'Could not create the account.');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-default p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-content-emphasis">bullwatch hub</h1>
          <p className="mt-1 text-sm text-content-subtle">
            {flow === 'signIn' ? 'Sign in to your hub' : 'Create the first account'}
          </p>
        </div>
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
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
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
              className="mt-1 h-9 w-full rounded-lg border border-border-subtle bg-bg-default px-2.5 text-sm text-content-emphasis outline-none focus:border-border-emphasis focus:ring-0"
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
            className="mt-4 w-full text-center text-xs text-content-muted hover:text-content-emphasis"
          >
            Don&apos;t have an account? Sign up
          </button>
        )}
        {flow === 'signUp' && (
          <button
            type="button"
            data-testid="signin-toggle-flow"
            onClick={() => setFlow('signIn')}
            className="mt-4 w-full text-center text-xs text-content-muted hover:text-content-emphasis"
          >
            Already have an account? Sign in
          </button>
        )}
        {flow === 'signIn' && !canSignUp && (
          <p className="mt-4 text-center text-xs text-content-muted">
            Ask an existing user to invite you.
          </p>
        )}
      </div>
    </div>
  );
}
