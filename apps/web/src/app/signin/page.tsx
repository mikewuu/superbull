import { fetchQuery } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';
import { SignInForm } from './_components/sign-in-form';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const canSignUp = await fetchQuery(api.users.canSignUp, {});

  return <SignInForm canSignUp={canSignUp} />;
}
