import { type VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm transition-all disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-bg-subtle disabled:text-content-subtle',
  {
    variants: {
      variant: {
        primary: 'border-black bg-black text-white enabled:hover:bg-neutral-800',
        secondary:
          'border-border-subtle bg-bg-default text-content-emphasis enabled:hover:bg-bg-muted data-[state=open]:border-border-emphasis data-[state=open]:ring-4 data-[state=open]:ring-border-subtle',
        outline: 'border-transparent text-content-default enabled:hover:bg-neutral-900/5',
        danger:
          'border-red-500 bg-red-500 text-white enabled:hover:bg-red-600 enabled:hover:ring-4 enabled:hover:ring-red-100',
        'danger-outline':
          'border-transparent bg-white text-red-500 enabled:hover:bg-red-600 enabled:hover:text-white',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  text?: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
}

export function Button(props: ButtonProps) {
  const { text, icon, loading, variant, className, disabled, type, ...rest } = props;

  return (
    <button
      type={type ?? 'button'}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant }), className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {text}
    </button>
  );
}
