import type { ReactNode } from 'react';
import { AuthProviders } from '../AuthProviders';

interface InviteLayoutProps {
  children: ReactNode;
}

export default function InviteLayout(props: InviteLayoutProps) {
  const { children } = props;

  return <AuthProviders>{children}</AuthProviders>;
}
