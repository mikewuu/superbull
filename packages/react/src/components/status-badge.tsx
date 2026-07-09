import { type VariantProps, cva } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const statusBadgeVariants = cva(
  'flex max-w-fit items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-neutral-500/[.15] text-neutral-600',
        new: 'bg-bg-info text-content-info',
        success: 'bg-bg-success text-content-success',
        pending: 'bg-bg-attention text-content-attention',
        warning: 'bg-bg-warning text-content-warning',
        error: 'bg-bg-error text-content-error',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function StatusBadge(props: StatusBadgeProps) {
  const { icon: Icon, variant, className, children } = props;

  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {Icon && <Icon className="size-3 shrink-0" />}
      {children}
    </span>
  );
}
