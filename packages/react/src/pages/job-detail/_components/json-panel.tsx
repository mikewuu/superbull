interface JsonPanelProps {
  title: string;
  value: unknown;
}

export function JsonPanel(props: JsonPanelProps) {
  const { title, value } = props;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-2sm font-medium text-content-emphasis">{title}</h2>
      <pre className="candy-card overflow-x-auto rounded-lg p-4 font-mono text-xs text-content-default">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
