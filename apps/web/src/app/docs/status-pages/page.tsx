import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { content, headers, outro, rows } from './content';

export const metadata: Metadata = {
  title: 'Status pages: SuperBull docs',
  description: 'Public uptime pages derived from ingested queue health.',
};

export default function StatusPagesPage() {
  return (
    <>
      <DocsMarkdown content={content} />
      <DocsTable headers={headers} rows={rows} />
      <DocsMarkdown content={outro} />
    </>
  );
}
