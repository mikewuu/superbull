import { useState } from 'react';

type WindowOption = 'any' | '15m' | '1h' | '24h' | '7d';

const windowMsByOption: Record<Exclude<WindowOption, 'any'>, number> = {
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
  '24h': 24 * 60 * 60_000,
  '7d': 7 * 24 * 60 * 60_000,
};

interface CreatedAfterFilterProps {
  onChange: (createdAfterMs: number | null) => void;
}

export function CreatedAfterFilter(props: CreatedAfterFilterProps) {
  const { onChange } = props;
  const [selected, setSelected] = useState<WindowOption>('any');

  const changeOption = (option: WindowOption) => {
    setSelected(option);
    onChange(option === 'any' ? null : Date.now() - windowMsByOption[option]);
  };

  return (
    <label className="flex items-center gap-1.5 text-2sm text-content-subtle">
      Created after
      <select
        data-testid="created-after-filter"
        aria-label="Created after"
        value={selected}
        onChange={(event) => changeOption(event.target.value as WindowOption)}
        className="h-8 rounded-lg border-border-subtle bg-white py-0 pl-2 pr-7 text-2sm text-content-default focus:border-border-emphasis focus:ring-0"
      >
        <option value="any">Any time</option>
        <option value="15m">15 minutes</option>
        <option value="1h">1 hour</option>
        <option value="24h">24 hours</option>
        <option value="7d">7 days</option>
      </select>
    </label>
  );
}
