export const intro = `
# Analytics

Every analytics view — the hub's **Analytics** page, dashboard cards, and status
page uptime — reads from the same \`ingestEvents\` table events post to via
[ingest](/docs/hub#ingest). There's no separate rollup job; series are computed
from raw events per request.

## Range → bucket size
`;

export const rangeHeaders = ['range', 'window', 'bucket_minutes'];
export const rangeRows = [
  ['24h', 'last 24 hours', '60 (hourly)'],
  ['7d', 'last 7 days', '240 (4-hourly)'],
  ['30d', 'last 30 days', '1440 (daily)'],
];

export const mid = `
Wider ranges use coarser buckets automatically — there's no manual granularity
control. \`throughput\` and \`latency\` take
\`{ source_id, queue_name?, from_ts, to_ts, bucket_minutes }\` (\`queue_name\` omitted
scopes to every queue on the source); \`totals\` and \`heatmap\` take only
\`{ source_id, from_ts, to_ts }\` — they aren't bucketed and aren't queue-scoped.

## Series
`;

export const seriesHeaders = ['Series', 'Point shape'];
export const seriesRows = [
  ['throughput', '{ bucket_ts, completed, failed }'],
  ['latency', '{ bucket_ts, wait_p50, wait_p95, run_p50, run_p95 }'],
  ['totals (per queue, whole range, no buckets)', '{ queue_name, completed, failed, job_seconds }'],
  ['heatmap', '{ matrix: number[][], timezone: "UTC" }'],
];

export const outro = `
\`totals\` isn't bucketed — it's one row per queue summed over the whole
\`from_ts\`–\`to_ts\` window, used for the totals table/card. \`heatmap\` returns a
matrix (day × hour of week, UTC) of activity counts for the heatmap card and grid.

These are internal Convex query calls (\`analytics.throughputSeries\`,
\`analytics.latencySeries\`, \`analytics.queueTotals\`, \`analytics.heatmap\`), not
public REST endpoints — the hub's Analytics page and dashboard cards call them
server-side. Use [dashboards](/docs/dashboards) to save a fixed view, or the hub's
Analytics page for ad hoc source/queue/range filtering.
`;
