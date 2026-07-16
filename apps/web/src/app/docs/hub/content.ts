export const intro = `
# Hub

The hub is the hosted SuperBull app at superbull.com: sign in with Google,
create connectors, and get history, analytics, error tracking, email alerts,
and public status pages across every connector in your workspace, without
deploying anything yourself.

Three pieces make it up:

- **Web app** (Vercel) — marketing, docs, the product itself under
  \`/app/[workspaceSlug]/...\`, and public status pages at \`/status/[slug]\`.
- **Gateway** (\`connect.superbull.com\`) — the always-on service each
  connector opens its one outbound WebSocket to. Terminates every connector's
  connection and relays requests from the web app to the right one.
- **Convex** — the datastore for everything: workspaces, members, connectors,
  ingested events, alert rules, dashboards, status page configs.

There's no separate hub-side Redis and no long-lived worker process to run
yourself; the pieces above are all that's needed.

## Workspaces

Signing in for the first time creates a personal workspace automatically. A
workspace has members, each holding one of three roles:
`;

export const headers = ['Role', 'Typical permissions'];
export const rows = [
  [
    'owner',
    'Everything an admin can do, plus manage billing, delete the workspace, and change other members’ roles',
  ],
  ['admin', 'Invite members, create and remove connectors, manage alerts/dashboards/status pages'],
  ['member', 'View dashboards and analytics, operate connectors (retry/pause/etc.)'],
];

export const ingestSection = `
Invite teammates by email from workspace settings; an invite carries the role
it was sent with. Every workspace query and mutation checks membership first
(\`convex/access.ts\`), so one user's workspaces never see another's data.

## Creating a connector

**Connectors → New connector** in a workspace gives you a one-time enrollment
token, shown exactly once. Paste it into \`npx @superbull/connector --token
...\` (see [Connector](/docs/connector)) and the dashboard for that connector
goes live at \`/app/[workspaceSlug]/connectors/[connectorId]\` as soon as it
connects. The same flow is available to an agent through the \`add_connector\`
MCP tool (see [MCP](/docs/mcp)).

## Ingest

Connectors don't get polled. Each one streams \`job.completed\`/\`job.failed\`
events and 60-second \`queue.snapshot\`s over its WebSocket as \`events\` frames;
the gateway acknowledges with \`events_ack\` and forwards the batch to Convex's
\`ingest:recordBatch\`, deduped by event \`uuid\` (at-least-once delivery, so
duplicates are expected and harmless). Up to 500 events per batch.

## Per-connector dashboard

\`/app/[workspaceSlug]/connectors/[connectorId]\` serves the same
\`@superbull/react\` SPA a standalone board serves, pointed at that connector.
The web app relays each request to the gateway, which forwards it over that
connector's live WebSocket and waits for a response; there's no direct HTTP
hop to the connector, since it never accepts inbound connections. If the
connector is offline, requests fail fast with \`502 { "error": "connector
disconnected" }\` rather than queuing; a connector that doesn't answer in time
fails with \`504\`.

## Background jobs

Alert evaluation and digests run as Convex crons, not a separate worker
process:

- **evaluateAlerts**: every 5 minutes. Evaluates every enabled alert rule
  against recent ingest data and sends alert emails for state transitions.
- **sendDigest**: daily at 9am. Sends each alert rule's owner a 24-hour digest
  summary, rendered with React Email and sent through Resend from a
  \`"use node"\` Convex action.

See [Alerts](/docs/alerts) for rule types and email behavior.
`;
