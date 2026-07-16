import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { DocsTable } from '../_components/docs-table';
import { DocsToc } from '../_components/docs-toc';
import { getHeadings } from '../_lib/get-headings';
import {
  globalHeaders,
  globalRows,
  hostedHeaders,
  hostedIntro,
  hostedOutro,
  hostedRows,
  intro,
  jobHeaders,
  jobHeading,
  jobIntro,
  jobRows,
  midMarkdown,
  queueHeaders,
  queueRows,
} from './content';

export const metadata: Metadata = {
  title: 'REST API: SuperBull docs',
  description: 'Every route mounted by createBoard(), request and response shapes.',
};

const headings = [
  ...getHeadings(intro),
  ...getHeadings(midMarkdown),
  ...getHeadings(jobHeading),
  ...getHeadings(jobIntro),
  ...getHeadings(hostedIntro),
];

export default function ApiPage() {
  return (
    <div className="xl:flex xl:items-start xl:gap-10">
      <div className="min-w-0 flex-1">
        <DocsMarkdown content={intro} />
        <DocsTable headers={globalHeaders} rows={globalRows} />
        <DocsMarkdown content={midMarkdown} />
        <DocsTable headers={queueHeaders} rows={queueRows} />
        <DocsMarkdown content={jobHeading} />
        <DocsTable headers={jobHeaders} rows={jobRows} />
        <DocsMarkdown content={jobIntro} />
        <DocsMarkdown content={hostedIntro} />
        <DocsTable headers={hostedHeaders} rows={hostedRows} />
        <DocsMarkdown content={hostedOutro} />
      </div>
      <DocsToc headings={headings} />
    </div>
  );
}
