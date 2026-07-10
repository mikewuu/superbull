import { slugify } from './slugify';

export type DocsHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function getHeadings(markdown: string): DocsHeading[] {
  const headings: DocsHeading[] = [];

  for (const line of markdown.split('\n')) {
    const h3Text = line.match(/^###\s+(.+)$/)?.[1];
    if (h3Text) {
      headings.push({ id: slugify(h3Text), text: h3Text, level: 3 });
      continue;
    }

    const h2Text = line.match(/^##\s+(.+)$/)?.[1];
    if (h2Text) {
      headings.push({ id: slugify(h2Text), text: h2Text, level: 2 });
    }
  }

  return headings;
}
