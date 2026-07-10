import { type VariantProps, cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium outline-none transition-[transform,background-color,color] duration-150 ease-snout focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:transform-none',
  {
    variants: {
      variant: {
        primary: 'candy border-transparent text-white',
        secondary: 'candy-pill border-transparent text-content-emphasis',
        outline: 'border-transparent text-content-default hover:bg-bg-subtle active:scale-[0.98]',
        danger: 'candy border-transparent text-white [--candy-color:#e5484d]',
        'danger-outline':
          'border-border-subtle bg-white text-content-error hover:bg-bg-error/60 active:scale-[0.98]',
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
