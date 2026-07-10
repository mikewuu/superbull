export const content = `
# Dashboards

Saved dashboards live in the hub: a named collection of cards, each pulling from
one source's ingested data over a fixed range. There's no drag-to-resize grid
builder; a dashboard is just an ordered list of cards you add and remove.

\`\`\`ts
interface SavedDashboard {
  id: string;
  name: string;
  cards: DashboardCard[];
  created_at: Date;
}

interface DashboardCard {
  type: 'throughput' | 'latency' | 'totals' | 'heatmap';
  source_id: string;
  queue_name?: string;   // omit for all queues on the source
  range: '24h' | '7d' | '30d';
}
\`\`\`

## Card types
`;

export const headers = ['Type', 'Shows', 'Backed by'];
export const rows = [
  ['throughput', 'Completed vs. failed jobs per time bucket', 'analytics.get-throughput-series'],
  ['latency', 'Wait/run p50 and p95 per time bucket', 'analytics.get-latency-series'],
  ['totals', 'Completed / failed / total compute time per queue', 'analytics.get-queue-totals'],
  ['heatmap', 'Activity matrix over the range', 'analytics.get-heatmap'],
];

export const outro = `
Create a dashboard, then add cards one at a time, each scoped to a source (and
optionally a single queue within it) and a range. Deleting a dashboard removes all
its cards with it. Cards aren't independently addressable. See
[Analytics](/docs/analytics) for what each underlying series computes.
`;
