import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { headers, intro, outro, rows } from './content';

export const metadata: Metadata = {
  title: 'Alerts: SuperBull docs',
  description: 'Alert rule types, evaluation, and email notifications.',
};

export default function AlertsPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={headers} rows={rows} />
      <DocsMarkdown content={outro} />
    </>
  );
}
