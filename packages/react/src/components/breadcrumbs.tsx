import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
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
    <span className="flex min-w-0 items-center gap-1.5">
      {items.map((item, index) => (
        <Fragment key={item.to ?? 'current'}>
          {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-content-muted" />}
          {item.to ? (
            <Link
              to={item.to}
              className="shrink-0 font-normal text-content-subtle transition-colors hover:text-content-emphasis"
            >
              {item.label}
            </Link>
          ) : (
            <span className="flex min-w-0 items-center gap-2 truncate">{item.label}</span>
          )}
        </Fragment>
      ))}
    </span>
  );
}
