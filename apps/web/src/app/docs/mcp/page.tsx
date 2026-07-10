import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { headers, intro, outro, rows } from './content';

export const metadata: Metadata = {
  title: 'MCP — SuperBull docs',
  description: 'Drive SuperBull from an agent — the hub MCP server and its tools.',
};

export default function McpPage() {
  return (
    <>
      <DocsMarkdown content={intro} />
      <DocsTable headers={headers} rows={rows} />
      <DocsMarkdown content={outro} />
    </>
  );
}
