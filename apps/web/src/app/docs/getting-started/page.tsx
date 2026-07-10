import type { Metadata } from 'next';
import { DocsMarkdown } from '../_components/docs-markdown';
import { content } from './content';

export const metadata: Metadata = {
  title: 'Getting started: SuperBull docs',
  description: 'Pick a mode, install the right packages, and open the dashboard.',
};

export default function GettingStartedPage() {
  return <DocsMarkdown content={content} />;
}
