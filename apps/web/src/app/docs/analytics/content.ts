export const intro = `
# Analytics

The workspace's **Analytics** page, dashboard cards, and status page uptime all
read from the same ingested-events table that connectors stream into via
[ingest](/docs/hub#ingest). There's no separate rollup job; series are computed
from raw events per request (bounded at the 10,000 most recent events in the
requested window per query).

## Range → bucket size
`;

export const rangeHeaders = ['range', 'window', 'bucket_minutes'];
export const rangeRows = [
  ['24h', 'last 24 hours', '60 (hourly)'],
  ['7d', 'last 7 days', '240 (4-hourly)'],
  ['30d', 'last 30 days', '1440 (daily)'],
];

export const mid = `
Wider ranges use coarser buckets automatically; there's no manual granularity
control in the UI. Under the hood, \`throughput\` and \`latency\` take
\`{ workspaceId, connectorId, queueName?, fromTs, toTs, bucketMinutes }\`
(\`queueName\` omitted scopes to every queue on the connector); \`totals\` and
\`heatmap\` take only \`{ workspaceId, connectorId, fromTs, toTs }\`. They aren't
bucketed and aren't queue-scoped.

## Series
`;

export const seriesHeaders = ['Series', 'Point shape'];
export const seriesRows = [
  ['throughput', '{ bucket_ts, completed, failed }'],
  [
    'latency',
    '{ bucket_ts, wait_p50, wait_p95, run_p50, run_p95 }: null when a bucket has no samples',
  ],
  [
    'totals (per queue, whole range, no buckets)',
    '{ queue_name, completed, failed, job_seconds }: job_seconds is null when no durations were reported',
  ],
  ['heatmap', '{ matrix: number[7][24], timezone: "UTC" }'],
];

export const outro = `
\`totals\` isn't bucketed. It's one row per queue summed over the whole
\`fromTs\`–\`toTs\` window, used for the totals table/card. \`heatmap\` returns a
7×24 matrix (UTC day of week × hour of day, Sunday first) counting completed
plus failed jobs, for the heatmap card and grid.

These are internal Convex query calls (\`analytics.throughputSeries\`,
\`analytics.latencySeries\`, \`analytics.queueTotals\`, \`analytics.heatmap\`), not
public REST endpoints; the Analytics page and dashboard cards call them
server-side. Use [dashboards](/docs/dashboards) to save a fixed view, or the
Analytics page for ad hoc connector/queue/range filtering.
`;
