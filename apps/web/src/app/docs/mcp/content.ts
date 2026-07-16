export const intro = `
# MCP

SuperBull is agent-operable: point an agent at the hub's MCP server and it can
watch your queues, open a failed job and read its stack trace, retry the job,
or pause a queue that's failing fast: the same actions you'd otherwise click
through a dashboard for.

The hub exposes that MCP server at \`/api/mcp\` (server name \`superbull-hub\`),
authenticated with the same \`SUPERBULL_API_TOKEN\` bearer token as the hub's
management REST API. It's streamable-HTTP only. No SSE transport,
\`maxDuration: 60\`.

## Connect your agent

Claude Code:

\`\`\`bash
claude mcp add --transport http superbull-hub https://superbull.com/api/mcp \\
  --header "Authorization: Bearer YOUR_SUPERBULL_API_TOKEN"
\`\`\`

Claude Desktop (\`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "superbull-hub": {
      "type": "streamable-http",
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

## Diagnose and retry a failed job

Tool instructions group the surface as **discover** (list what's registered),
**inspect** (read queue/job state), and **act** (mutate a queue or job). An
agent is expected to list connectors and queues before acting on one. A
typical run:

\`\`\`
> get_queue({ connector_id: "cnn_9f2a", queue_name: "email", status: "failed" })

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

> retry_job({ connector_id: "cnn_9f2a", queue_name: "email", job_id: "482" })

{ "retried": true, "job_id": "482" }
\`\`\`

(\`get_queue\`'s real response also carries \`statuses\`, \`pagination\`, and
permission flags, trimmed above for readability.)

## Tools
`;

export const headers = ['Tool', 'Input', 'Description'];
export const rows = [
  [
    'list_connectors',
    '{}',
    'List every connector in the workspace (id, name, is_connected, created_at): tokens are never returned',
  ],
  ['remove_connector', '{ connector_id: string }', 'Delete a connector'],
  [
    'list_queues',
    '{ connector_id: string }',
    "List a connector's queues; returns [{ name, counts, is_paused }]",
  ],
  [
    'get_queue',
    '{ connector_id: string, queue_name: string, status?: string, page?: number }',
    'Return one queue and its matching page of jobs, filtered by status',
  ],
  [
    'retry_job',
    '{ connector_id: string, queue_name: string, job_id: string }',
    'Retry a failed or completed job on that connector',
  ],
  ['pause_queue', '{ connector_id: string, queue_name: string }', "Stop a queue's processing"],
  ['resume_queue', '{ connector_id: string, queue_name: string }', 'Resume a paused queue'],
];

export const outro = `
All tools that take a \`connector_id\` relay the request to that connector over
its live WebSocket connection (web → gateway → connector), the same path the
per-connector dashboard uses. A connector with no live connection fails the
call immediately with "connector disconnected" rather than queuing it.
\`status\` on \`get_queue\` accepts a comma-separated list of job statuses, same
as the REST \`GET /api/queues\` \`status\` param. See [REST API](/docs/api).
`;
