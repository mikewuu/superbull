import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ReactNode } from 'react';

interface PopoverProps {
  trigger: ReactNode;
  showing: boolean;
  onShowingChange: (showing: boolean) => void;
  align?: 'start' | 'center' | 'end';
  children: ReactNode;
}

export function Popover(props: PopoverProps) {
  const { trigger, showing, onShowingChange, align, children } = props;

  return (
    <PopoverPrimitive.Root open={showing} onOpenChange={onShowingChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align ?? 'start'}
          sideOffset={8}
          className="z-50 animate-scale-in-fade rounded-lg border border-border-subtle bg-bg-default p-1 drop-shadow-card-hover"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
