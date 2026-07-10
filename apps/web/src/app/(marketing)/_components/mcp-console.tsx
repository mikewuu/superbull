'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';

type ToolId =
  | 'list_queues'
  | 'get_queue'
  | 'retry_job'
  | 'pause_queue'
  | 'resume_queue'
  | 'list_sources'
  | 'add_source'
  | 'remove_source';

const tools: Record<ToolId, { desc: string; request: string; response: string }> = {
  list_queues: {
    desc: 'Queue names, counts, and paused state for one source.',
    request: '{ "tool": "list_queues", "arguments": { "source": "my-app" } }',
    response:
      '{ "queues": [\n    { "name": "send-emails", "waiting": 5, "failed": 0 },\n    { "name": "process-videos", "waiting": 0, "failed": 0 },\n    { "name": "sync-contacts", "waiting": 0, "paused": true }\n  ] }',
  },
  get_queue: {
    desc: "One queue's current page of jobs, filtered by status.",
    request:
      '{ "tool": "get_queue", "arguments": {\n    "source": "my-app", "queue": "send-emails", "status": "failed" } }',
    response:
      '{ "jobs": [\n    { "id": 41, "name": "invoice-receipt", "attempts": 3,\n      "failedReason": "smtp timeout" }\n  ], "total": 1 }',
  },
  retry_job: {
    desc: 'Retry a failed or completed job.',
    request:
      '{ "tool": "retry_job", "arguments": { "source": "my-app", "queue": "send-emails", "id": 41 } }',
    response: '{ "id": 41, "status": "waiting" }',
  },
  pause_queue: {
    desc: "Stop a queue's processing.",
    request:
      '{ "tool": "pause_queue", "arguments": { "source": "my-app", "queue": "process-videos" } }',
    response: '{ "queue": "process-videos", "paused": true }',
  },
  resume_queue: {
    desc: 'Resume a paused queue.',
    request:
      '{ "tool": "resume_queue", "arguments": { "source": "my-app", "queue": "sync-contacts" } }',
    response: '{ "queue": "sync-contacts", "paused": false }',
  },
  list_sources: {
    desc: 'List the proxy sources the hub federates, without their bearer tokens.',
    request: '{ "tool": "list_sources", "arguments": {} }',
    response:
      '{ "sources": [\n    { "name": "my-app", "url": "https://proxy.example.com", "queues": 3 }\n  ] }',
  },
  add_source: {
    desc: 'Register a remote proxy; stores its token, never returns it.',
    request:
      '{ "tool": "add_source", "arguments": {\n    "name": "my-app", "url": "https://proxy.example.com", "token": "..." } }',
    response: '{ "name": "my-app", "url": "https://proxy.example.com" }',
  },
  remove_source: {
    desc: 'Remove a proxy source the hub federates.',
    request: '{ "tool": "remove_source", "arguments": { "name": "my-app" } }',
    response: '{ "name": "my-app", "removed": true }',
  },
};

const toolIds = Object.keys(tools) as ToolId[];
const cycleDelayMs = 4000;

export function McpConsole(): React.ReactElement {
  const [id, setId] = useState<ToolId>('get_queue');
  const [isPaused, setIsPaused] = useState(false);
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);
  const active = tools[id];

  useEffect(() => {
    if (isPaused || hasUserSelectedTab) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = setInterval(() => {
      setId((current) => toolIds[(toolIds.indexOf(current) + 1) % toolIds.length] as ToolId);
    }, cycleDelayMs);
    return () => clearInterval(timer);
  }, [isPaused, hasUserSelectedTab]);

  function selectTab(toolId: ToolId) {
    setHasUserSelectedTab(true);
    setId(toolId);
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-default"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="flex flex-wrap gap-1 border-b border-border-subtle px-3 pt-3 pb-2">
        {toolIds.map((toolId) => (
          <button
            key={toolId}
            type="button"
            onClick={() => selectTab(toolId)}
            className={cn('rounded-md px-2.5 py-1 font-mono text-xs transition-colors', {
              'bg-bg-inverted text-white': id === toolId,
              'text-content-subtle hover:text-content-emphasis': id !== toolId,
            })}
          >
            {toolId}
          </button>
        ))}
      </div>
      <p className="px-5 pt-4 text-2sm text-content-default">{active.desc}</p>
      <div className="grid gap-px bg-border-subtle sm:grid-cols-2">
        <div className="min-h-[232px] bg-bg-inverted p-5">
          <p className="font-mono text-xs text-white/40">request</p>
          <pre className="mt-2 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all text-white/85">
            {active.request}
          </pre>
        </div>
        <div className="min-h-[232px] bg-bg-inverted p-5">
          <p className="font-mono text-xs text-white/40">response</p>
          <pre className="mt-2 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all text-candy-green/80">
            {active.response}
          </pre>
        </div>
      </div>
    </div>
  );
}
