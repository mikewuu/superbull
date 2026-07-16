import type { ReactNode } from 'react';
import { AuthProviders } from '../AuthProviders';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout(props: AppLayoutProps) {
  const { children } = props;

  return <AuthProviders>{children}</AuthProviders>;
}
