export const intro = `
# Alerts

Alert rules live in your project and are evaluated against ingested events
every 5 minutes by a Convex cron. Create rules from the project's **Alerts**
page; there's no REST/MCP route for rule management yet.

A rule is scoped to one connector or to every connector in the project, and
always has a \`window_minutes\` (how far back evaluation looks) and a
notification email. The other fields depend on the type:

## Rule types
`;

export const headers = ['Type', 'Fires when', 'Fields used'];
export const rows = [
  [
    'failed_threshold',
    'failed-job count (all queues, or one queue_name if set) is >= threshold within window_minutes',
    'threshold, window_minutes (required); queue_name (optional)',
  ],
  [
    'stuck_queue',
    'the latest snapshot in window_minutes shows waiting/prioritized jobs on queue_name with zero completions in that window',
    'queue_name, window_minutes (required); threshold is not read',
  ],
  [
    'worker_loss',
    'the latest snapshot in window_minutes for queue_name reports zero workers',
    'queue_name, window_minutes (required); threshold is not read',
  ],
  [
    'new_error_group',
    'an error group first seen within window_minutes exists for the rule’s connector(s)',
    'window_minutes (required); queue_name and threshold are not read',
  ],
];

export const outro = `
Rules can be disabled without deleting them; only enabled rules are evaluated.
Since \`stuck_queue\` and \`worker_loss\` read the latest \`queue.snapshot\`, they
depend on the connector being (recently) connected; a fully stopped connector
stops producing snapshots.

## State machine

Each rule tracks a state: \`firing\` or \`resolved\`, with the timestamps of the
last transition and notification. A transition in either direction sends one
email (\`resolved → firing\` sends a firing email, \`firing → resolved\` a
resolved email); steady state never re-notifies.

## Email

Two templates render with \`@react-email/components\` and send through Resend.
When \`RESEND_API_KEY\` isn't set on the Convex deployment, sends are skipped
with a console warning instead of failing, so local dev doesn't need a Resend
account:

- **Alert email**: sent immediately on a firing/resolved transition, one rule
  per email, subject \`[superbull] alert firing: <summary>\` (or
  \`alert resolved\`).
- **Digest email**: sent daily at 09:00 UTC, one per distinct alert-rule email
  address per project, summarizing that project's connectors over the last
  24 hours: completed/failed counts and the top error groups per connector.
  Every rule's email gets a digest, including disabled rules'.

\`EMAIL_FROM\` on the Convex deployment controls the From address (default
\`superbull <alerts@resend.dev>\`).
`;
