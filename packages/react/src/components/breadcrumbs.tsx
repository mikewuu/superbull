import { Breadcrumbs as BreadcrumbsBase } from '@bullwatch/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs(props: BreadcrumbsProps) {
  const { items } = props;

  return (
    <BreadcrumbsBase
      items={items}
      renderLink={({ to, className, children }) => (
        <Link to={to} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
