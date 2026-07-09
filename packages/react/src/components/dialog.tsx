import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

interface DialogProps {
  showing: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Dialog(props: DialogProps) {
  const { showing, onClose, title, children } = props;

  return (
    <DialogPrimitive.Root open={showing} onOpenChange={() => onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-black/20" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-scale-in-fade rounded-xl border border-border-subtle bg-bg-default p-6 shadow-lg"
        >
          <DialogPrimitive.Title className="text-lg font-semibold text-content-emphasis">
            {title}
          </DialogPrimitive.Title>
          <div className="mt-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
