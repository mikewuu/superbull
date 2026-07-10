import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { headers, intro, redaction, rows } from './content';

export const metadata: Metadata = {
  title: 'Configuration — SuperBull docs',
  description:
    'Queue adapter options — read-only mode, retries, redaction, multi-Redis, Prometheus.',
};

export default function ConfigurationPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={headers} rows={rows} />
      <DocsMarkdown content={redaction} />
    </>
  );
}
