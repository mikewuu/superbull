import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { behavior, flagHeaders, flagRows, intro } from './content';

export const metadata: Metadata = {
  title: 'Proxy: SuperBull docs',
  description: 'Run superbull-proxy as a headless agent next to your workers.',
};

export default function ProxyPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={flagHeaders} rows={flagRows} />
      <DocsMarkdown content={behavior} />
    </>
  );
}
