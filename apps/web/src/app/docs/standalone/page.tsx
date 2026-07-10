import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { adapterHeaders, adapterRows, intro, perAdapter } from './content';

export const metadata: Metadata = {
  title: 'Standalone — SuperBull docs',
  description: 'Embed SuperBull in your Node app with a framework adapter.',
};

export default function StandalonePage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={adapterHeaders} rows={adapterRows} />
      <DocsMarkdown content={perAdapter} />
    </>
  );
}
