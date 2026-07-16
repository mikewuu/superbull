export const content = `
# Status pages

A status page is a public, unauthenticated page at \`/status/:slug\`, showing
90 days of daily uptime for one connector's queues, derived entirely from
ingested events. There's no separate "incident" model to maintain by hand.

## Configure

From the workspace's **Status pages** section, pick a connector, a slug, a
title, an optional logo, and which queues to include (empty means all queues
on that connector). One config per connector:

- \`slug\`: 3-50 characters, lowercase letters, digits, and hyphens
  (\`/^[a-z0-9-]{3,50}$/\`), globally unique across all workspaces.
- \`is_enabled\`: a disabled page 404s publicly without losing its config.
- \`queue_names\`: when set, the page shows one uptime strip per queue below
  the overall strip (per-queue strips only render when more than one queue is
  listed).
- Logo uploads go to Convex file storage via a generated upload URL, not the
  web app's filesystem.

## Uptime calculation

A day's rate is \`completed / (completed + failed)\` over that day's ingested
job events (UTC days); a day with no events has no rate and renders as empty.
The badge at the top reflects the **latest day's** rate:
`;

export const headers = ['Latest day', 'Overall status'];
export const rows = [
  ['rate >= 0.99', 'operational'],
  ['0.95 <= rate < 0.99', 'degraded'],
  ['rate < 0.95', 'issues'],
  ['no data', 'operational (not counted against the page)'],
];

export const outro = `
The strip shows the last 90 days (today included) as daily bars, plus a
rolling 90-day percentage computed over all events in the window. Days with
no data don't count against the rolling rate.

Public page routes revalidate every 60 seconds (\`export const revalidate =
60\`) and are marked \`noindex, nofollow\`.
`;
