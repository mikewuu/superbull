import type { ReactNode } from 'react';
import { AuthProviders } from '../AuthProviders';

interface OAuthLayoutProps {
  children: ReactNode;
}

export default function OAuthLayout(props: OAuthLayoutProps) {
  const { children } = props;

  return <AuthProviders>{children}</AuthProviders>;
}
