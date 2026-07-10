import { Copy } from 'lucide-react';

interface JsonPanelProps {
  title: string;
  copyLabel: string;
  value: unknown;
}

export function JsonPanel(props: JsonPanelProps) {
  const { title, copyLabel, value } = props;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2sm font-medium text-content-emphasis">{title}</h2>
        <button
          type="button"
          aria-label={copyLabel}
          className="flex size-6 items-center justify-center rounded-md text-content-muted hover:bg-bg-muted"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(value, null, 2)).catch(() => undefined);
          }}
        >
          <Copy className="size-3.5" />
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto rounded-md border border-border-subtle bg-bg-muted p-3 font-mono text-xs text-content-default">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
