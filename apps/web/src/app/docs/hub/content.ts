export const intro = `
# Hosted app

The hosted app at superbull.com is the other way to run SuperBull: sign in with
Google, create connectors, and get history, analytics, error tracking, email
alerts, and public status pages across every connector in your project,
without deploying anything yourself. (Some UI and internals still call this
the "hub", its pre-projects name.)

Three pieces make it up:

- **Web app** (Vercel): marketing, docs, the product itself under
  \`/app/[projectSlug]/...\`, and public status pages at \`/status/[slug]\`.
- **Gateway** (\`connect.superbull.com\`): the always-on service each
  connector opens its one outbound WebSocket to. It terminates every
  connector's connection and forwards their event batches into the datastore.
- **Convex**: the datastore for everything: projects, members, connectors,
  ingested events, error groups, alert rules, dashboards, status page configs.

There's no separate server-side Redis and no long-lived worker process to run
yourself; the pieces above are all that's needed.

## Projects

Signing in for the first time creates a personal project automatically. A
project has members, each holding one of three roles:
`;

export const headers = ['Role', 'Permissions'];
export const rows = [
  [
    'owner',
    'Everything an admin can do, plus delete the project (with name confirmation). The owner cannot be removed from the project',
  ],
  [
    'admin',
    'Everything a member can do, plus invite members, revoke invites, remove members, and delete connectors',
  ],
  [
    'member',
    'Everything else: create connectors, operate their dashboards (retry/pause/etc.), and manage alerts, dashboards, and status pages',
  ],
];

export const ingestSection = `
Owners and admins invite teammates by email; an invite carries the role it was
sent with, expires after 7 days, and can only be accepted by an account whose
email matches. Every project query and mutation checks membership first, and
a non-member gets the same "not found" as a bad id, so one project's
existence is never leaked to another's users.

## Creating a connector

**Connectors → New connector** in a project gives you a one-time enrollment
token, shown exactly once, plus the exact \`npx @superbull/connector\` command
to run (see [Connector](/docs/connector)). As soon as it connects, everything
ingest-driven (history, analytics, alerts, status pages; see Ingest below)
goes live for it, and so does the embedded live dashboard at
\`/app/[projectSlug]/connectors/[connectorId]\`. Until the connector dials in
for the first time, that dashboard URL shows enrollment guidance instead and
swaps itself for the dashboard as soon as the connector connects.

## Ingest

Connectors don't get polled. Each one streams \`job.completed\`/\`job.failed\`
events and 60-second \`queue.snapshot\`s over its WebSocket as \`events\` frames;
the gateway acknowledges with \`events_ack\` and records the batch in Convex,
deduped by event \`uuid\` per connector (at-least-once delivery, so duplicates
are expected and harmless). Up to 500 events per batch. Everything ingest-driven (history,
[analytics](/docs/analytics), [alerts](/docs/alerts),
[status pages](/docs/status-pages)) works whenever the connector is or was
connected; nothing about it requires an inbound path to your infrastructure.

## Per-connector dashboard

\`/app/[projectSlug]/connectors/[connectorId]\` serves the same
\`@superbull/react\` SPA a standalone board serves, pointed at that connector,
and live actions there (retry, pause, add) run against your real queues. Every
dashboard request, reads included, is relayed through the gateway's RPC bridge
and answered by the connector over its own WebSocket, so a WebSocket-only
connector is fully operable with no inbound path to your infrastructure. There
is no queuing: a connector with no live session answers
\`502 { "error": "connector disconnected" }\`, and one that doesn't reply within
10 seconds answers \`504 { "error": "connector timeout" }\`.

## Background jobs

Alert evaluation and digests run as Convex crons, not a separate worker
process:

- **evaluate alerts**: every 5 minutes. Evaluates every enabled alert rule
  against recent ingest data and sends an email for each rule that starts or
  stops firing.
- **send daily digest**: daily at 09:00 UTC. Sends each distinct alert-rule
  email address a digest of its project's connectors over the last 24 hours.

See [Alerts](/docs/alerts) for rule types and email behavior.
`;
