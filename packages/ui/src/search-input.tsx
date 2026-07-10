import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchInput(props: SearchInputProps) {
  const { value, placeholder, onChange } = props;
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (draft === value) {
      return;
    }
    const handle = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(handle);
  }, [draft, value, onChange]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-content-muted" />
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className="h-9 w-56 rounded-lg border-border-subtle bg-bg-default pl-8 pr-8 text-sm text-content-emphasis placeholder:text-content-muted focus:border-border-emphasis focus:ring-0"
      />
      {draft && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setDraft('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-content-muted hover:text-content-emphasis"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
