type Entry =
  | { id: string; kind: 'message'; from: 'you' | 'agent'; text: string }
  | { id: string; kind: 'call'; tool: string; args: string; result: string };

const entries: Entry[] = [
  {
    id: 'ask',
    kind: 'message',
    from: 'you',
    text: "Email queue's been quiet since midnight. What's wrong?",
  },
  {
    id: 'get-queue',
    kind: 'call',
    tool: 'get_queue',
    args: '{ connector_id: "cnn_9f2a", queue_name: "email", status: "failed" }',
    result:
      '{ "queue": { "name": "email", "jobs": [\n    { "id": "482", "attempts": 3,\n      "failed_reason": "connect ECONNREFUSED 127.0.0.1:587",\n      "stacktrace": ["at TCPConnectWrap.afterConnect (node:net:1494:16)"],\n      "is_failed": true } ] } }',
  },
  {
    id: 'diagnosis',
    kind: 'message',
    from: 'agent',
    text: "ECONNREFUSED on port 587. SMTP was down when this ran, and it's back now. Retrying job 482.",
  },
  {
    id: 'retry-job',
    kind: 'call',
    tool: 'retry_job',
    args: '{ connector_id: "cnn_9f2a", queue_name: "email", job_id: "482" }',
    result: '{ "retried": true, "job_id": "482" }',
  },
  {
    id: 'follow-up',
    kind: 'message',
    from: 'agent',
    text: 'Retried. Two more failed the same way. Want those retried too?',
  },
];

export function AgentTranscript(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-default">
      <div className="flex items-center gap-1.5 border-b border-border-subtle bg-bg-muted px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
        <span className="h-2.5 w-2.5 rounded-full bg-border-default" />
        <span className="ml-2 rounded-md bg-bg-default px-2.5 py-0.5 text-2sm text-content-subtle ring-1 ring-border-subtle">
          agent · superbull-hub mcp
        </span>
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        {entries.map((entry) => {
          if (entry.kind === 'message') {
            return (
              <div key={entry.id}>
                <p className="font-mono text-xs text-content-subtle uppercase">{entry.from}</p>
                <p className="mt-1 text-2sm leading-relaxed text-content-default">{entry.text}</p>
              </div>
            );
          }
          return (
            <div key={entry.id} className="rounded-lg bg-bg-inverted p-4">
              <p className="font-mono text-xs text-white/40">{entry.tool}</p>
              <pre className="mt-1.5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all text-white/85">
                {entry.args}
              </pre>
              <p className="mt-2.5 font-mono text-xs text-white/40">→</p>
              <pre className="mt-1 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all text-candy-green/80">
                {entry.result}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
