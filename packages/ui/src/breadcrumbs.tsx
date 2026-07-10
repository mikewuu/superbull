import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
}

interface RenderLinkProps {
  to: string;
  className: string;
  children: ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  renderLink?: (props: RenderLinkProps) => ReactNode;
}

export function Breadcrumbs(props: BreadcrumbsProps) {
  const { items, renderLink = defaultRenderLink } = props;

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {items.map((item, index) => (
        <Fragment key={item.to ?? 'current'}>
          {index > 0 && <ChevronRight className="size-3.5 shrink-0 text-content-muted" />}
          {item.to ? (
            renderLink({
              to: item.to,
              className:
                'shrink-0 font-normal text-content-subtle transition-colors hover:text-content-emphasis',
              children: item.label,
            })
          ) : (
            <span className="flex min-w-0 items-center gap-2 truncate">{item.label}</span>
          )}
        </Fragment>
      ))}
    </span>
  );
}

function defaultRenderLink(props: RenderLinkProps) {
  const { to, className, children } = props;
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}
