import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function MenuItem(props: MenuItemProps) {
  const { icon: Icon, label, danger, disabled, onClick } = props;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-sm text-content-default hover:bg-bg-muted disabled:cursor-not-allowed disabled:text-content-muted disabled:hover:bg-transparent',
        { 'text-content-error hover:bg-bg-error/60': danger },
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  );
}
