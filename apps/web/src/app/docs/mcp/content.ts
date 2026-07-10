export const intro = `
# MCP

SuperBull is agent-operable: point an agent at the hub's MCP server and it can
watch your queues, open a failed job and read its stack trace, retry the job, or
pause a queue that's failing fast — the same actions you'd otherwise click through
a dashboard for.

The hub exposes that MCP server at \`/api/mcp\` (server name \`superbull-hub\`),
authenticated with the same \`SUPERBULL_API_TOKEN\` bearer token as the hub's
management REST API. It's streamable-HTTP only — no SSE transport,
\`maxDuration: 60\`.

## Connect your agent

Claude Code:

\`\`\`bash
claude mcp add --transport http superbull-hub https://your-hub.example.com/api/mcp \\
  --header "Authorization: Bearer YOUR_SUPERBULL_API_TOKEN"
\`\`\`

Claude Desktop (\`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "superbull-hub": {
      "type": "streamable-http",
      "url": "https://your-hub.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_SUPERBULL_API_TOKEN"
      }
    }
  }
}
\`\`\`

(Some Claude Desktop versions only accept remote servers through Settings →
Connectors rather than a hand-edited config file — use whichever your version
exposes.)

## Diagnose and retry a failed job

Tool instructions group the surface as **discover** (list what's registered),
**inspect** (read queue/job state), and **act** (mutate a queue or job) — an agent
is expected to list sources and queues before acting on one. A typical run:

\`\`\`
> get_queue({ source_id: "src_9f2a", queue_name: "email", status: "failed" })

{
  "queue": {
    "name": "email",
    "counts": { "waiting": 0, "active": 0, "completed": 128, "failed": 3, "delayed": 0 },
    "is_paused": false,
    "jobs": [
      {
        "id": "482",
        "name": "send-welcome",
        "attempts": 3,
        "failed_reason": "connect ECONNREFUSED 127.0.0.1:587",
        "stacktrace": [
          "Error: connect ECONNREFUSED 127.0.0.1:587",
          "    at TCPConnectWrap.afterConnect (node:net:1494:16)"
        ],
        "is_failed": true
      }
    ]
  }
}

> retry_job({ source_id: "src_9f2a", queue_name: "email", job_id: "482" })

{ "retried": true, "job_id": "482" }
\`\`\`

(\`get_queue\`'s real response also carries \`statuses\`, \`pagination\`, and
permission flags — trimmed above for readability.)

## Tools
`;

export const headers = ['Tool', 'Input', 'Description'];
export const rows = [
  [
    'list_sources',
    '{}',
    'List every registered proxy source (id, name, url, created_at) — tokens are never returned',
  ],
  [
    'add_source',
    '{ name: string, url: string (URL), token: string }',
    'Register a new proxy source; the token is stored, never echoed back',
  ],
  ['remove_source', '{ source_id: string }', 'Delete a registered source'],
  [
    'list_queues',
    '{ source_id: string }',
    "Forward GET queues to the source's proxy; returns [{ name, counts, is_paused }]",
  ],
  [
    'get_queue',
    '{ source_id: string, queue_name: string, status?: string, page?: number }',
    'Forward GET queues?active_queue=...&status=...&page=... and return the matching queue, jobs included',
  ],
  [
    'retry_job',
    '{ source_id: string, queue_name: string, job_id: string }',
    "PUT queues/:queue/:jobId/retry on the source's proxy",
  ],
  [
    'pause_queue',
    '{ source_id: string, queue_name: string }',
    "PUT queues/:queue/pause on the source's proxy",
  ],
  [
    'resume_queue',
    '{ source_id: string, queue_name: string }',
    "PUT queues/:queue/resume on the source's proxy",
  ],
];

export const outro = `
All tools that take a \`source_id\` forward the request to that source's registered
proxy (or standalone board) URL, authenticated with the bearer token stored for it
at \`add_source\` time — the same path \`/s/:sourceId/api/*\` on the hub's own web UI
uses. \`status\` on \`get_queue\` accepts a comma-separated list of job statuses, same
as the REST \`GET /api/queues\` \`status\` param — see [REST API](/docs/api).
`;
