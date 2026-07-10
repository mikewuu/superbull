interface PropertiesPanelProps {
  jobId: string;
  attempts: number;
  delayMs?: number;
  priority?: number;
}

export function PropertiesPanel(props: PropertiesPanelProps) {
  const { jobId, attempts, delayMs, priority } = props;

  return (
    <div className="px-4 py-3">
      <PropertyRow label="ID" value={`#${jobId}`} />
      <PropertyRow label="Attempts" value={String(attempts)} />
      {delayMs ? <PropertyRow label="Delay" value={`${delayMs}ms`} /> : null}
      {priority !== undefined && <PropertyRow label="Priority" value={String(priority)} />}
    </div>
  );
}

function PropertyRow(props: { label: string; value: string }) {
  const { label, value } = props;

  return (
    <div className="flex justify-between py-1">
      <span className="text-2sm text-content-subtle">{label}</span>
      <span className="font-mono text-2sm text-content-emphasis">{value}</span>
    </div>
  );
}
