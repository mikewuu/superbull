import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { DocsToc } from '../_components/docs-toc';
import { getHeadings } from '../_lib/get-headings';
import { headers, ingestSection, intro, rows } from './content';

export const metadata: Metadata = {
  title: 'Hub: SuperBull docs',
  description:
    'The hosted app: workspaces, connectors, analytics, alerts, error tracking, and status pages.',
};

const headings = [...getHeadings(intro), ...getHeadings(ingestSection)];

export default function HubPage() {
  return (
    <div className="xl:flex xl:items-start xl:gap-10">
      <div className="min-w-0 flex-1">
        <DocsMarkdown content={intro} />
        <DocsTable headers={headers} rows={rows} />
        <DocsMarkdown content={ingestSection} />
      </div>
      <DocsToc headings={headings} />
    </div>
  );
}
