import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';

export const metadata: Metadata = {
  title: 'Status pages — SuperBull docs',
  description: 'Public uptime pages derived from ingested queue health.',
};

const content = `
# Status pages

A status page is a public, unauthenticated page at \`/status/:slug\` on the hub,
showing 90-day uptime for one source's queues, derived entirely from ingested
events — there's no separate "incident" model to maintain by hand.

## Configure

From the hub's **Status pages** section, pick a source, a slug, a title, an
optional logo, and which queues to include (empty means all queues on that
source). Configuration lives in Convex as \`StatusPageConfig\`:

\`\`\`ts
interface StatusPageConfig {
  id: string;
  source_id: string;
  slug: string;
  is_enabled: boolean;
  title: string;
  logo_storage_id: string | null;
  queue_names: string[];
}
\`\`\`

Logo upload goes through a Convex file-storage upload URL
(\`generate-status-page-logo-upload-url\`) rather than the hub's own filesystem.

## Uptime calculation
`;

const headers = ['Daily rate', 'Overall status'];
const rows = [
  ['rate === 1, or rate >= 0.99', 'operational'],
  ['0.95 <= rate < 0.99', 'degraded'],
  ['rate < 0.95', 'issues'],
  ['no data for the day', 'operational (not counted against the page)'],
];

const outro = `
Each day's rate comes from ingested queue-health events for that source (and, if
scoped, that queue) over the previous 90 days, rendered as a strip of daily bars
plus a rolling 90-day percentage. If a status page includes more than one queue,
each gets its own uptime strip below the overall one.

Public page routes revalidate every 60 seconds (\`export const revalidate = 60\`)
and are marked \`noindex, nofollow\`.
`;

export default function StatusPagesPage() {
  return (
    <>
      <DocsMarkdown content={content} />
      <DocsTable headers={headers} rows={rows} />
      <DocsMarkdown content={outro} />
    </>
  );
}
