'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/cn';

type ToolId =
  | 'list_queues'
  | 'get_queue'
  | 'get_queue_stats'
  | 'retry_job'
  | 'pause_queue'
  | 'resume_queue'
  | 'list_connectors'
  | 'remove_connector';

const tools: Record<ToolId, { desc: string; request: string; response: string }> = {
  list_queues: {
    desc: 'Queue names, job counts, and paused state for one connector.',
    request: '{ "tool": "list_queues", "arguments": { "connector_id": "cnn_9f2a" } }',
    response:
      '{ "queues": [\n    { "name": "send-emails", "counts": { "waiting": 5, "failed": 0 }, "is_paused": false },\n    { "name": "process-videos", "counts": { "waiting": 0, "failed": 0 }, "is_paused": false },\n    { "name": "sync-contacts", "counts": { "waiting": 0, "failed": 0 }, "is_paused": true }\n  ] }',
  },
  get_queue: {
    desc: "One queue's current page of jobs, filtered by status.",
    request:
      '{ "tool": "get_queue", "arguments": {\n    "connector_id": "cnn_9f2a", "queue_name": "send-emails", "status": "failed" } }',
    response:
      '{ "queue": { "name": "send-emails", "jobs": [\n    { "id": "482", "attempts": 3,\n      "failed_reason": "connect ECONNREFUSED 127.0.0.1:587",\n      "is_failed": true } ] } }',
  },
  get_queue_stats: {
    desc: 'Wait/run percentiles, retry rate, top errors, and drain estimate for one queue.',
    request:
      '{ "tool": "get_queue_stats", "arguments": {\n    "connector_id": "cnn_9f2a", "queue_name": "send-emails" } }',
    response:
      '{ "stats": { "wait_ms": { "p50": 130, "p95": 2200 },\n    "run_ms": { "p50": 45, "p95": 310 }, "retry_rate": 0.04,\n    "top_errors": [{ "message": "connect ECONNREFUSED 127.0.0.1:587", "count": 3 }],\n    "est_drain_ms": 15000 } }',
  },
  retry_job: {
    desc: 'Retry a failed or completed job.',
    request:
      '{ "tool": "retry_job", "arguments": {\n    "connector_id": "cnn_9f2a", "queue_name": "send-emails", "job_id": "482" } }',
    response: '{ "retried": true, "job_id": "482" }',
  },
  pause_queue: {
    desc: "Stop a queue's processing.",
    request:
      '{ "tool": "pause_queue", "arguments": { "connector_id": "cnn_9f2a", "queue_name": "process-videos" } }',
    response: '{ "paused": true, "queue_name": "process-videos" }',
  },
  resume_queue: {
    desc: 'Resume a paused queue.',
    request:
      '{ "tool": "resume_queue", "arguments": { "connector_id": "cnn_9f2a", "queue_name": "sync-contacts" } }',
    response: '{ "resumed": true, "queue_name": "sync-contacts" }',
  },
  list_connectors: {
    desc: 'List every registered connector, without their bearer tokens.',
    request: '{ "tool": "list_connectors", "arguments": {} }',
    response:
      '{ "connectors": [\n    { "id": "cnn_9f2a", "name": "my-app", "url": "https://proxy.internal:9865",\n      "created_at": "2026-03-02T18:04:00.000Z" } ] }',
  },
  remove_connector: {
    desc: 'Delete a connector and its stored credential.',
    request: '{ "tool": "remove_connector", "arguments": { "connector_id": "cnn_9f2a" } }',
    response: '{ "removed": true, "connector_id": "cnn_9f2a" }',
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
