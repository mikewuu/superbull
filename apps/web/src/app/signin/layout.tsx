import type { ReactNode } from 'react';
import { AuthProviders } from '../AuthProviders';

interface SignInLayoutProps {
  children: ReactNode;
}

export default function SignInLayout(props: SignInLayoutProps) {
  const { children } = props;

  return <AuthProviders>{children}</AuthProviders>;
}
