---
name: superbull-mcp
description: >
  Operate BullMQ queues through the SuperBull MCP server: discover connectors
  and queues, diagnose slow or failing queues with stats, stack traces, and job
  logs, then act by retrying, promoting, removing, or enqueuing jobs and
  pausing, resuming, or cleaning queues. Use when the user wants to inspect or
  fix background jobs and has SuperBull connected. Triggers: "failed jobs",
  "queue is stuck", "queue backlog", "retry the job", "BullMQ", "SuperBull".
---

# SuperBull MCP

Server `https://superbull.com/api/mcp` (streamable HTTP), every call
authenticated with `Authorization: Bearer $SUPERBULL_API_TOKEN`. Connect from
Claude Code in one line:

```sh
claude mcp add --transport http superbull https://superbull.com/api/mcp \
  --header "Authorization: Bearer $SUPERBULL_API_TOKEN"
```

If the token is missing, ask the user for it; it is the deployment's
`SUPERBULL_API_TOKEN`. It is deployment-wide (not per workspace), so treat
every mutation as production and say what you changed.

## The operating loop

1. `list_connectors` and pick the connector by name; every other tool needs
   its `connector_id`. Never guess ids.
2. `list_queues(connector_id)` for the map: per-queue job counts and
   `is_paused`. A big `failed` or `waiting` count tells you where to look.
3. `get_queue_stats(connector_id, queue_name)` before touching anything:
   p50/p95 wait and run times, `retry_rate`, `stalled_count`, recent
   completed/failed window counts, `top_errors`, `est_drain_ms`. How to read
   it: rising `wait_ms` with normal `run_ms` means not enough workers (or the
   queue is paused); `top_errors` clustering on one message means one root
   cause, not many; `stalled_count > 0` means workers are dying mid-job;
   `est_drain_ms` says how long the backlog needs at current throughput.
4. Drill in: `get_queue(connector_id, queue_name, status: "failed")` lists the
   matching jobs (paginate with `page`, filter with a comma list like
   `"failed,waiting"`). `get_job` returns one job in full (`data`, `opts`,
   `attempts`, `failed_reason`, `stacktrace`, `return_value`);
   `get_job_logs` returns what it wrote via `job.log()`.
5. Act, narrowest tool first: `retry_job`, `promote_job`, `remove_job`,
   `add_job` (its `data` is optional and defaults to `null`),
   `pause_queue`/`resume_queue`, `clean_queue`.

## Judgment defaults

- Inspect before you mutate. Read `get_job`'s `failed_reason` and `stacktrace`
  before retrying or removing anything; never act on a job you have not looked
  at.
- Retry one job first and re-check it. If it fails again with the same error,
  the failure is not transient; fix the cause (or report it) instead of
  retrying the rest.
- Prefer `retry_job` over `remove_job` or `clean_queue`: a retry preserves the
  job and its data, removal is permanent and unlogged.
- A queue failing fast and burning attempts: `pause_queue`, fix or report,
  then `resume_queue`. Tell the user the queue is paused; nothing processes
  until someone resumes it.
- Job payload wrong? In-place edits are not exposed. `add_job` a corrected
  copy (start from `get_job`'s `data`), then `remove_job` the bad one if the
  user wants it gone.
- `clean_queue` only on explicit user request, and confirm the status first:
  it permanently deletes every job in that status older than a 5-second grace
  window.
- Mass-destructive operations (drain, empty, obliterate, concurrency changes,
  bulk actions) are deliberately not MCP tools. Do not work around that
  through the REST API; point the user at the dashboard instead.

## Error handling

Errors come back with the proxy's own message, which names the rule you hit:

- `connector not found`: wrong `connector_id`, or the connector was enrolled
  through the newer gateway flow and has no stored proxy url/token, so it is
  not reachable over MCP yet. Re-run `list_connectors`; if it is listed but
  still errors, send the user to the dashboard for that connector.
- `proxy unreachable`: the connector's proxy is down or unreachable. Calls
  fail fast and are never queued; report it rather than retrying in a loop.
- `queue is read-only`: the proxy mounted this queue read-only, so every
  mutating tool is rejected. Inspect-only; suggest changes for the user to
  apply where the queue is writable.
- `retries are disabled for this queue` and
  `job is in "<state>" state and cannot be retried`: `retry_job` only works
  from `failed` or `completed`, only where the queue allows retries, and
  completed retries can be disabled separately.
- Requests cap at 60 seconds. Page through `get_queue` with `page` rather
  than trying to pull everything at once.
