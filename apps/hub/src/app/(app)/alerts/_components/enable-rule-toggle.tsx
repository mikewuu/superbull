'use client';

import { cn } from '@superbull/ui';
import { useTransition } from 'react';
import { setAlertRuleEnabledAction } from '../actions';

interface EnableRuleToggleProps {
  ruleId: string;
  isEnabled: boolean;
}

export function EnableRuleToggle(props: EnableRuleToggleProps) {
  const { ruleId, isEnabled } = props;
  const [pending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await setAlertRuleEnabledAction(ruleId, !isEnabled);
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEnabled}
      disabled={pending}
      onClick={handleToggle}
      data-testid="enable-rule-toggle"
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ease-snout disabled:opacity-60',
        { 'bg-blue-600': isEnabled, 'bg-neutral-300': !isEnabled },
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white transition-transform duration-150 ease-snout',
          { 'translate-x-[18px]': isEnabled, 'translate-x-0.5': !isEnabled },
        )}
      />
    </button>
  );
}
