export const intro = `
# Hosted app

The hosted app at superbull.com is the other way to run SuperBull: sign in with
Google, create connectors, and get history, analytics, error tracking, email
alerts, and public status pages across every connector in your workspace,
without deploying anything yourself. (Some UI and internals still call this
the "hub", its pre-workspaces name.)

Three pieces make it up:

- **Web app** (Vercel): marketing, docs, the product itself under
  \`/app/[workspaceSlug]/...\`, and public status pages at \`/status/[slug]\`.
- **Gateway** (\`connect.superbull.com\`): the always-on service each
  connector opens its one outbound WebSocket to. It terminates every
  connector's connection and forwards their event batches into the datastore.
- **Convex**: the datastore for everything: workspaces, members, connectors,
  ingested events, error groups, alert rules, dashboards, status page configs.

There's no separate server-side Redis and no long-lived worker process to run
yourself; the pieces above are all that's needed.

## Workspaces

Signing in for the first time creates a personal workspace automatically. A
workspace has members, each holding one of three roles:
`;

export const headers = ['Role', 'Permissions'];
export const rows = [
  [
    'owner',
    'Everything an admin can do, plus delete the workspace (with name confirmation). The owner cannot be removed from the workspace',
  ],
  ['admin', 'Everything a member can do, plus invite members, revoke invites, remove members, and delete connectors'],
  [
    'member',
    'Everything else: create connectors, operate their dashboards (retry/pause/etc.), and manage alerts, dashboards, and status pages',
  ],
];

export const ingestSection = `
Owners and admins invite teammates by email; an invite carries the role it was
sent with, expires after 7 days, and can only be accepted by an account whose
email matches. Every workspace query and mutation checks membership first, and
a non-member gets the same "not found" as a bad id, so one workspace's
existence is never leaked to another's users.

## Creating a connector

**Connectors → New connector** in a workspace gives you a one-time enrollment
token, shown exactly once, plus the exact \`npx @superbull/connector\` command
to run (see [Connector](/docs/connector)). As soon as it connects, everything
ingest-driven (history, analytics, alerts, status pages; see Ingest below)
goes live for it. The embedded live dashboard at
\`/app/[workspaceSlug]/connectors/[connectorId]\` is the transitional
exception: today it requires a connector registered with a reachable URL
through the legacy proxy flow (see the caveat under Per-connector dashboard).

## Ingest

Connectors don't get polled. Each one streams \`job.completed\`/\`job.failed\`
events and 60-second \`queue.snapshot\`s over its WebSocket as \`events\` frames;
the gateway acknowledges with \`events_ack\` and records the batch in Convex,
deduped by event \`uuid\` (at-least-once delivery, so duplicates are expected
and harmless). Up to 500 events per batch. Everything ingest-driven (history,
[analytics](/docs/analytics), [alerts](/docs/alerts),
[status pages](/docs/status-pages)) works whenever the connector is or was
connected; nothing about it requires an inbound path to your infrastructure.

## Per-connector dashboard

\`/app/[workspaceSlug]/connectors/[connectorId]\` serves the same
\`@superbull/react\` SPA a standalone board serves, pointed at that connector,
and live actions there (retry, pause, add) run against your real queues. One
transitional caveat: the web app currently forwards every dashboard request,
reads included, over a direct HTTP path retained from the legacy
\`superbull-proxy\` agent, which requires a connector registered with a
reachable URL. A connector enrolled through the WebSocket flow answers
\`502 { "error": "this connector hasn't been enrolled through the legacy proxy flow" }\`,
and a proxy-registered one that is unreachable answers
\`502 { "error": "proxy unreachable" }\`. Relaying those requests over the
gateway's WebSocket, so that WebSocket-only connectors are fully operable with
no inbound path, is built on the gateway side but not yet wired into the web
app.

## Background jobs

Alert evaluation and digests run as Convex crons, not a separate worker
process:

- **evaluate alerts**: every 5 minutes. Evaluates every enabled alert rule
  against recent ingest data and sends an email for each rule that starts or
  stops firing.
- **send daily digest**: daily at 09:00 UTC. Sends each distinct alert-rule
  email address a digest of its workspace's connectors over the last 24 hours.

See [Alerts](/docs/alerts) for rule types and email behavior.
`;
