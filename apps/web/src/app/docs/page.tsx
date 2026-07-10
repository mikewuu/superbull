import type { Metadata } from 'next';
import { DocsMarkdown } from './_components/docs-markdown';
import { content } from './content';

export const metadata: Metadata = {
  title: 'SuperBull docs',
  description:
    'Monitor and operate BullMQ queues — standalone board, headless proxy, or a federated hub.',
};

export default function DocsOverviewPage() {
  return <DocsMarkdown content={content} />;
}
