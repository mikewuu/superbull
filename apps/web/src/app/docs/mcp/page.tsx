import type { Metadata } from 'next';
import { Fragment } from 'react';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { intro, outro, toolGroups, toolHeaders } from './content';

export const metadata: Metadata = {
  title: 'MCP: SuperBull docs',
  description: 'Drive SuperBull from an agent: the MCP server and its tools.',
};

export default function McpPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      {toolGroups.map((group) => (
        <Fragment key={group.title}>
          <DocsMarkdown content={`### ${group.title}\n\n${group.blurb}`} />
          <DocsTable headers={toolHeaders} rows={group.rows} />
        </Fragment>
      ))}
      <DocsMarkdown content={outro} />
    </>
  );
}
