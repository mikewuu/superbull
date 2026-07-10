import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { intro, mid, outro, rangeHeaders, rangeRows, seriesHeaders, seriesRows } from './content';

export const metadata: Metadata = {
  title: 'Analytics — SuperBull docs',
  description: 'Throughput, latency, totals, and heatmap series derived from ingested events.',
};

export default function AnalyticsPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={rangeHeaders} rows={rangeRows} />
      <DocsMarkdown content={mid} />
      <DocsTable headers={seriesHeaders} rows={seriesRows} />
      <DocsMarkdown content={outro} />
    </>
  );
}
