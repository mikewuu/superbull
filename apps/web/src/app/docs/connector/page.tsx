import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { behavior, flagHeaders, flagRows, intro } from './content';

export const metadata: Metadata = {
  title: 'Connector: SuperBull docs',
  description: 'Run superbull-connector next to your workers, outbound-only, no inbound port.',
};

export default function ConnectorPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={flagHeaders} rows={flagRows} />
      <DocsMarkdown content={behavior} />
    </>
  );
}
