export const intro = `
# MCP

SuperBull is agent-operable: point an agent at the MCP server and it can watch
your queues, open a failed job and read its stack trace, retry it, enqueue new
work, or pause a queue that's failing fast. The same actions you'd otherwise
click through the dashboard for.

The server lives at \`/api/mcp\` (server name \`superbull-hub\`). Transport is
streamable HTTP only, no SSE, with a 60 second cap per request.

## Connect your agent

Claude Code, one line:

\`\`\`bash
claude mcp add --transport http superbull https://superbull.com/api/mcp \\
  --header "Authorization: Bearer $SUPERBULL_API_TOKEN"
\`\`\`

Cursor (\`~/.cursor/mcp.json\`) and Claude Desktop
(\`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "superbull": {
      "type": "streamable-http",
      "url": "https://superbull.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPERBULL_API_TOKEN"
      }
    }
  }
}
\`\`\`

VS Code (\`.vscode/mcp.json\`):

\`\`\`json
{
  "servers": {
    "superbull": {
      "type": "http",
      "url": "https://superbull.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPERBULL_API_TOKEN"
      }
    }
  }
}
\`\`\`

(Some Claude Desktop versions only accept remote servers through Settings →
Connectors rather than a hand-edited config file. Use whichever your version
exposes.)

## Auth

Every call must carry \`Authorization: Bearer\` with the deployment's
\`SUPERBULL_API_TOKEN\`, the same token the management REST API uses. The
server compares it with a timing-safe check and rejects a missing or wrong
token with 401 before any tool runs. Authenticated calls are rate limited to
120 requests/minute in one window shared with the management REST API; over
it you get a \`429\` with a \`retry-after\` header in seconds.

One caveat, stated plainly: this token is deployment-wide, not per project
or per user. Anyone holding it can list and act on every connector on the
deployment. Per-project API keys are planned; until they land, treat
\`SUPERBULL_API_TOKEN\` like a production credential.

## Diagnose and retry a failed job

The server's own instructions group the tools as **discover** (what's
registered), **inspect** (read queue and job state), and **act** (mutate a
queue or job). An agent is expected to discover and inspect before acting. A
typical run:

\`\`\`
> get_queue_stats({ connector_id: "cnn_9f2a", queue_name: "email" })

{ "stats": { "wait_ms": { "p50": 130, "p95": 2200 }, "run_ms": { "p50": 45, "p95": 310 },
    "retry_rate": 0.04, "stalled_count": 0, "failed_count_window": 3,
    "completed_count_window": 128,
    "top_errors": [{ "message": "connect ECONNREFUSED 127.0.0.1:587", "count": 3 }],
    "est_drain_ms": 15000 } }

> get_queue({ connector_id: "cnn_9f2a", queue_name: "email", status: "failed" })

{ "queue": { "name": "email", "is_paused": false,
    "counts": { "waiting": 0, "active": 0, "completed": 128, "failed": 3, "delayed": 0 },
    "jobs": [{ "id": "482", "name": "send-welcome", "attempts": 3,
      "failed_reason": "connect ECONNREFUSED 127.0.0.1:587", "is_failed": true }] } }

> retry_job({ connector_id: "cnn_9f2a", queue_name: "email", job_id: "482" })

{ "retried": true, "job_id": "482" }
\`\`\`

(\`get_queue\`'s real response also carries \`stacktrace\`, \`statuses\`,
\`pagination\`, and permission flags, trimmed above for readability.)

## Tools
`;

export const toolHeaders = ['Tool', 'Input', 'Description'];

export const toolGroups = [
  {
    title: 'Discover',
    blurb: 'What is registered with this deployment.',
    rows: [
      [
        'list_connectors',
        '{}',
        'List every connector in the deployment (id, name, is_connected, created_at); enrollment tokens are never returned',
      ],
      [
        'remove_connector',
        '{ connector_id: string }',
        'Delete a connector; create new ones in the web UI (Connectors, New connector)',
      ],
    ],
  },
  {
    title: 'Inspect',
    blurb: 'Read queue and job state. All read-only.',
    rows: [
      [
        'list_queues',
        '{ connector_id: string }',
        "List a connector's queues with job counts and paused state",
      ],
      [
        'get_queue',
        '{ connector_id: string, queue_name: string, status?: string, page?: number }',
        'One queue plus its current page of jobs; status is a comma list like "failed,waiting"',
      ],
      [
        'get_queue_stats',
        '{ connector_id: string, queue_name: string }',
        'p50/p95 wait and run times, retry rate, stalled count, recent completed/failed counts, top errors, estimated drain time',
      ],
      [
        'get_job',
        '{ connector_id: string, queue_name: string, job_id: string }',
        'One job in full: data, opts, progress, attempts, failed_reason, stacktrace, return_value, timestamps',
      ],
      [
        'get_job_logs',
        '{ connector_id: string, queue_name: string, job_id: string }',
        'The log lines the job wrote via job.log()',
      ],
    ],
  },
  {
    title: 'Act',
    blurb: 'Mutate a queue or job. Every one of these is rejected on read-only queues.',
    rows: [
      [
        'add_job',
        '{ connector_id: string, queue_name: string, name: string, data?: any, options?: { delay?, attempts?, priority? } }',
        'Enqueue a job; data defaults to null; delay is ms, attempts is total tries, lower priority runs first',
      ],
      [
        'retry_job',
        '{ connector_id: string, queue_name: string, job_id: string }',
        'Re-run a failed or completed job; the queue must allow retries',
      ],
      [
        'promote_job',
        '{ connector_id: string, queue_name: string, job_id: string }',
        'Make a delayed job runnable now instead of waiting out its delay',
      ],
      [
        'remove_job',
        '{ connector_id: string, queue_name: string, job_id: string }',
        'Permanently delete one job',
      ],
      ['pause_queue', '{ connector_id: string, queue_name: string }', "Stop a queue's processing"],
      ['resume_queue', '{ connector_id: string, queue_name: string }', 'Resume a paused queue'],
      [
        'clean_queue',
        '{ connector_id: string, queue_name: string, status: string }',
        'Bulk-delete jobs in one status (completed, wait, active, delayed, or failed) older than a 5-second grace window',
      ],
    ],
  },
];

export const outro = `
Every tool that takes a \`connector_id\` relays the call to that connector over
its own WebSocket, via the gateway's RPC bridge. There is no queuing or
retrying on the SuperBull side; you see the connector's answer or a fast
failure.

## Errors and limits

Tool failures come back as MCP error results carrying the error text from the
connector (or from the gateway, for delivery failures), so the message tells
you which rule you hit:

- \`connector not found\`: the \`connector_id\` doesn't match any connector.
- \`connector disconnected\`: the connector has no live WebSocket session, so
  the gateway rejects the call instead of queuing it. Start the connector,
  then re-run the tool.
- \`connector timeout\`: the connector is connected but didn't answer within
  10 seconds.
- \`queue is read-only\`: the connector can mount a queue read-only, which
  rejects every mutating tool (\`add_job\` through \`clean_queue\`) with HTTP 405.
- \`retries are disabled for this queue\`: \`retry_job\` on a queue with retries
  turned off. Completed-job retries can be disabled separately, in which case
  only failed jobs retry.
- \`job is in "<state>" state and cannot be retried\`: \`retry_job\` only works
  from \`failed\` or \`completed\`.
- Requests cap at 60 seconds; \`get_queue\` pages at the connector's page size,
  so paginate rather than raising it.

## Deliberately not exposed

Some connector routes exist in the queue API but are not MCP tools, on purpose.
They are either too destructive for an agent default or are operator decisions:

- \`drain\` and \`empty\`: mass-delete a queue's waiting and delayed jobs.
- \`obliterate\`: destroys the queue and its entire history.
- set concurrency: changes worker throughput deployment-wide.
- bulk job actions and retry-all/promote-all: one job at a time keeps agent
  actions reviewable and reversible.
- \`update-data\`: mutating a job's payload in place; enqueue a corrected job
  with \`add_job\` instead.
- pause-all across connectors: this one isn't a REST route either; there is
  deliberately no pause-all, so pause queues one at a time.

If you genuinely need one of these, use the connector's live dashboard (which
relays the full queue API), or the REST API in standalone mode. See
[REST API](/docs/api).
`;
