export const intro = `
# MCP

The hub exposes an MCP server at \`/api/mcp\` (server name \`superbull-hub\`),
authenticated with the same \`HUB_API_TOKEN\` bearer token as the hub's management
REST API. It's streamable-HTTP only — no SSE transport, \`maxDuration: 60\`.

\`\`\`bash
claude mcp add superbull-hub \\
  --url https://your-hub.example.com/api/mcp \\
  --header "Authorization: Bearer $HUB_API_TOKEN"
\`\`\`

Tool instructions group the surface as **discover** (list what's registered),
**inspect** (read queue/job state), and **act** (mutate a queue or job) — an agent
is expected to list sources and queues before acting on one.

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
