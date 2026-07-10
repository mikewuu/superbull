export const intro = `
# Alerts

Alert rules live in the hub (\`apps/hub\`) and are evaluated against ingested
events every 5 minutes by the \`evaluate-alerts\` cron. Create rules from the hub's
**Alerts** page or through Convex directly; there's no REST/MCP route for rule
management yet — evaluation and notification are the automated half.

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
    'queue_name (required), window_minutes — threshold is not read',
  ],
  [
    'worker_loss',
    'the latest snapshot in window_minutes for queue_name reports zero workers',
    'queue_name (required), window_minutes — threshold is not read',
  ],
  [
    'new_error_group',
    'an error group first seen within window_minutes exists for the rule’s source(s)',
    'window_minutes — queue_name and threshold are not read',
  ],
];

export const outro = `
Every rule has: \`id, source_id | null (null = all sources), type, queue_name | null, threshold | null, window_minutes | null, email, is_enabled\`.

## State machine

Each rule tracks an \`AlertState\`: \`{ rule_id, state: 'firing' | 'resolved', last_fired_ts, last_notified_ts }\`.
A rule transitions \`resolved → firing\` (sends a firing email) or \`firing →
resolved\` (sends a resolved email) — steady state doesn't re-notify.

## Email

Two templates render with \`@react-email/components\` (inline styles, no Tailwind)
and send through Resend (\`getResend()\`, a singleton on \`RESEND_API_KEY\` with a
no-op fallback when unset, so local dev doesn't need a Resend account):

- **Alert email** — sent immediately on a firing/resolved transition, one rule per
  email.
- **Digest email** — sent daily at 9am to every distinct alert-rule email address,
  summarizing all firing/resolved activity across their rules in the last 24 hours.

\`EMAIL_FROM\` controls the From address (default pattern: \`superbull <hub@...>\`).
See [Configuration](/docs/configuration) for the env vars.
`;
