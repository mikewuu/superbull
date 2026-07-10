import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { content, headers, outro, rows } from './content';

export const metadata: Metadata = {
  title: 'Dashboards: SuperBull docs',
  description: 'Saved dashboards of throughput, latency, totals, and heatmap cards.',
};

export default function DashboardsPage() {
  return (
    <>
      <DocsMarkdown content={content} />
      <DocsTable headers={headers} rows={rows} />
      <DocsMarkdown content={outro} />
    </>
  );
}
