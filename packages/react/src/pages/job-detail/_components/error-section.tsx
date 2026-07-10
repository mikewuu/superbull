interface ErrorSectionProps {
  failedReason: string;
  stacktrace: string[];
}

export function ErrorSection(props: ErrorSectionProps) {
  const { failedReason, stacktrace } = props;

  return (
    <div>
      <h2 className="border-b border-t border-border-subtle px-4 py-2 text-2sm font-medium text-content-error">
        Failed reason
      </h2>
      <pre className="whitespace-pre bg-bg-error/40 px-4 py-3 font-mono text-xs text-content-error">
        {failedReason}
        {stacktrace.length > 0 && `\n\n${stacktrace.join('\n')}`}
      </pre>
    </div>
  );
}
